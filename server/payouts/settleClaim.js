/**
 * Exactly-once payout settlement.
 *
 * This module is the single place where an on-chain bounty resolution is
 * sent. Both payout entry points — the `pull_request` merge webhook and the
 * manual retry route — settle through here so overlapping attempts
 * (double-clicked retry, concurrent webhook + retry, repeated merged events)
 * cannot each send a transaction for the same bounty.
 *
 * Protocol: acquire the bounty lease, acquire the claim, then send, then
 * settle the claim row first and the bounty row second. Every state change
 * is a conditional single-row update that reports whether it flipped, so a
 * loser observes `count === 0` and skips instead of sending. A worker that
 * dies mid-payout leaves `resolving`/`processing` rows behind; the next
 * attempt steals the lease once it is stale and either completes or
 * reconciles the payout — nothing sticks forever.
 *
 * The chain is the authority on whether funds moved, so the guard reads it
 * before every send and again after a failed one. A prior send may have
 * confirmed without being recorded, or another resolution may have mined
 * first and made ours revert. An unreadable chain fails open toward liveness
 * so RPC flakiness cannot block every payout; the escrow's own `NotOpen`
 * revert is the final guard against a double pay.
 *
 * "Resolved on-chain" is not "resolved to this claimant". Two PRs can claim
 * one bounty, so a resolved bounty only marks this claim `paid` when the
 * resolving transaction is this claim's pinned hash, or its recipient is
 * this claim's wallet. A resolution that cannot be found is neither: the
 * guard holds the leases rather than guess.
 *
 * Every send is signed first and its hash pinned to the claim before
 * broadcast. Whatever happens next (lost response, timeout, the platform
 * killing the function), the hash survives: recovery verifies that one
 * receipt instead of scanning chain history, and waits while that
 * transaction is still in the mempool instead of queueing a second send
 * behind it. A send without a receipt is not a failure: the guard keeps
 * both leases and returns `pending`.
 *
 * Leases are fenced. The bounty lease carries the stamp written on acquire,
 * and release/settle match on it, so a worker whose lease was stolen cannot
 * move the row out from under the worker that stole it. Claim leases live
 * under the bounty lease; a worker that steals a bounty lease also closes
 * any claim the dead worker left in `processing`.
 *
 * Failures carry a `reason`. Only `send-failed` carries provider text, which
 * can embed the RPC URL and its API key; `publicError` is the only message
 * safe to show a user or post to GitHub.
 *
 * Dependency-free except relative imports of lib/status and
 * lib/contractErrors (neither imports anything), so the orchestration can be
 * tested directly under node --test with injected query fakes — the same
 * pattern as integrations/github/webhookAuth.js. Status strings stay
 * canonical in lib/status; see CLAIM_STATUS and BOUNTY_STATUS there.
 */
import { BOUNTY_STATUS, CLAIM_STATUS } from '../../lib/status/index.js';
import { CONTRACT_ERROR_MESSAGES } from '../../lib/contractErrors.js';

/**
 * Why a settlement failed. Callers branch on this, never on error text.
 */
export const PAYOUT_FAILURE = {
  // The chain call failed. `error` is raw provider text: log it, never show it.
  SEND_FAILED: 'send-failed',
  // The bounty is already resolved on-chain, to a different claim.
  RESOLVED_ELSEWHERE: 'resolved-elsewhere',
  // The chain says the bounty can no longer pay out (refunded).
  NOT_PAYABLE_ONCHAIN: 'not-payable-onchain'
};

// Escrow reverts a resolve can hit, mapped to sentences safe to publish.
const PUBLISHABLE_REVERTS = ['NotOpen', 'DeadlinePassed', 'NotResolver'];

/**
 * Settles one claim's payout.
 *
 * @param {object} params
 * @param {number} params.claimId
 * @param {string} params.bountyId
 * @param {string} params.recipientAddress
 * @param {number} [params.nowMs] - clock injection for tests
 * @param {boolean} [params.allowSend] - false for the reconciler: settle
 *   only what the chain has already decided, act only on a stolen (stale)
 *   lease, and release instead of sending
 * @param {object} deps - injected collaborators (real query namespaces,
 *   chain sender, and on-chain reader in production; fakes in tests)
 * @returns {Promise<object>} `{ outcome: 'paid', txHash, reconciled? }`
 *   (`reconciled` when the payment was found on-chain rather than sent now),
 *   `{ outcome: 'pending', txHash, reason }` (leases held, nothing decided),
 *   `{ outcome: 'failed', reason, error, publicError }`,
 *   `{ outcome: 'released', reason }` (reconciler only: nothing reached the
 *   chain, rows handed back so the contributor can retry), or
 *   `{ outcome: 'skipped', reason }`.
 */
export async function settleClaim(
  { claimId, bountyId, recipientAddress, nowMs = Date.now(), allowSend = true },
  deps
) {
  const { bountyQueries, prClaimQueries, resolveBounty, readOnchainStatus, logger } = deps;

  const { acquired, stolen, lease } = await bountyQueries.tryAcquireForPayout(bountyId, nowMs);
  if (!acquired) {
    logger.info('Payout skipped: bounty already handled or in flight', { bountyId, claimId });
    return { outcome: 'skipped', reason: 'bounty-not-acquirable' };
  }
  if (!allowSend && !stolen) {
    // The reconciler only recovers dead workers. A bounty it found stale
    // that is `open` again was already handed back; leave it alone.
    await bountyQueries.releasePayout(bountyId, lease);
    return { outcome: 'skipped', reason: 'not-stale' };
  }

  const claimAcquired = await prClaimQueries.tryAcquireForPayout(claimId, {
    includeProcessing: stolen
  });
  if (!claimAcquired) {
    const claim = await prClaimQueries.findById(claimId);
    if (claim && claim.status === CLAIM_STATUS.PAID) {
      // Crash window: the transaction confirmed and the claim row flipped,
      // but the bounty row never did. Finish the bookkeeping, never re-send:
      // a `paid` claim means funds already moved.
      await bountyQueries.settlePayout(bountyId, claim.txHash, lease);
      logger.info('Payout skipped: claim already paid; bounty reconciled', { bountyId, claimId });
      return { outcome: 'skipped', reason: 'already-paid' };
    }
    await bountyQueries.releasePayout(bountyId, lease);
    logger.info('Payout skipped: claim not payable', { bountyId, claimId });
    return { outcome: 'skipped', reason: 'claim-not-acquirable' };
  }

  // A hash an earlier attempt pinned before broadcast. It lets the chain
  // read verify that exact receipt instead of searching for the resolution.
  const pinnedTxHash = (await prClaimQueries.findById(claimId))?.txHash ?? null;
  const ctx = { claimId, bountyId, recipientAddress, nowMs, lease, stolen, pinnedTxHash, deps };

  const before = await readChain(readOnchainStatus, ctx);
  const settledBefore = await settleFromChain(ctx, before);
  if (settledBefore) return settledBefore;

  if (before.pinnedPending) {
    // An earlier send is still in the mempool. A second send from the same
    // resolver would queue behind it on nonce and could only revert. Hold
    // the leases; the next attempt after this lease goes stale re-checks.
    logger.warn('Payout waiting on an earlier pending send; leases held', {
      bountyId,
      claimId,
      txHash: pinnedTxHash
    });
    return { outcome: 'pending', txHash: pinnedTxHash, reason: 'earlier-send-pending' };
  }

  if (!allowSend && before.status === null) {
    // The reconciler cannot tell whether the dead worker's send mined. A
    // live payout fails open toward liveness because the escrow revert
    // backs it; a release here would only invite that path blind. Hold.
    logger.warn('Reconciler could not read the chain; lease held', { bountyId, claimId });
    return { outcome: 'pending', txHash: pinnedTxHash, reason: 'chain-unreadable' };
  }

  // Nothing has settled on-chain. A claim the dead worker left in
  // `processing` (stolen lease only) sent nothing that mined; free it.
  if (stolen) {
    await prClaimQueries.closeStrandedClaims(bountyId, { exceptClaimId: claimId, resolvedAt: nowMs });
  }

  if (!allowSend) {
    // Reconciler: the dead worker's send never reached the chain. Hand both
    // rows back so the contributor's retry (or a redelivery) pays it through
    // the normal gated path, instead of moving money from a cron.
    await prClaimQueries.releasePayout(claimId, CLAIM_STATUS.FAILED);
    await bountyQueries.releasePayout(bountyId, lease);
    logger.warn('Reconciler released a stale payout lease for retry', { bountyId, claimId });
    return { outcome: 'released', reason: 'stale-lease' };
  }

  let signedTxHash = null;
  const onTxHash = async (txHash) => {
    signedTxHash = txHash;
    try {
      await prClaimQueries.recordPayoutTx(claimId, txHash);
    } catch (error) {
      logger.error('Could not pin payout tx to claim', { bountyId, claimId, txHash, error: error?.message });
    }
  };

  let result;
  try {
    result = await resolveBounty(bountyId, recipientAddress, { onTxHash });
  } catch (error) {
    // A throw after signing is not a failed send: the transaction may be on
    // the network and may still mine. Treat it like a missing receipt.
    result = signedTxHash
      ? { success: false, unconfirmed: true, txHash: signedTxHash, error: error?.message }
      : { success: false, error: error?.message || 'Unknown error during resolution' };
  }

  if (result && result.success) {
    // Claim row first: a crash here leaves claim=paid + bounty=resolving,
    // which the steal path reconciles. The reverse order would leave
    // bounty=resolved + claim=processing, which is unrecoverable.
    await prClaimQueries.settlePayout(claimId, result.txHash, nowMs);
    await bountyQueries.settlePayout(bountyId, result.txHash, lease);
    logger.info('Payout settled', { bountyId, claimId, txHash: result.txHash });
    return { outcome: 'paid', txHash: result.txHash };
  }

  if (result && result.unconfirmed && result.txHash) {
    // Sent, no receipt yet. Releasing here would invite a second send while
    // the first may still mine. Hold both leases, make sure the hash is
    // pinned, and let the next attempt reconcile once the lease is stale.
    if (signedTxHash !== result.txHash) {
      await prClaimQueries.recordPayoutTx(claimId, result.txHash);
    }
    logger.warn('Payout sent but unconfirmed; leases held for reconciliation', {
      bountyId,
      claimId,
      txHash: result.txHash
    });
    return { outcome: 'pending', txHash: result.txHash, reason: 'unconfirmed' };
  }

  // The send failed. The cause worth caring about is the chain moving under
  // us: another resolution mined first, so ours reverted NotOpen. Re-read
  // before reopening: an `open` row for a bounty the chain has resolved
  // strands this claim as `failed` once anything syncs the row.
  const after = await readChain(readOnchainStatus, ctx);
  const settledAfter = await settleFromChain(ctx, after);
  if (settledAfter) return settledAfter;

  const error = (result && result.error) || 'Unknown error during resolution';
  await prClaimQueries.releasePayout(claimId, CLAIM_STATUS.FAILED);
  await bountyQueries.releasePayout(bountyId, lease);
  logger.warn('Payout failed; rows released for retry', { bountyId, claimId });
  return failure(PAYOUT_FAILURE.SEND_FAILED, error, publishableRevert(error));
}

/**
 * Settles both rows from what the chain says, once the chain has decided.
 * Returns an outcome, or null when the bounty is still open (or unreadable)
 * and a send may proceed.
 */
async function settleFromChain(ctx, chain) {
  const { claimId, bountyId, recipientAddress, nowMs, lease, stolen, pinnedTxHash, deps } = ctx;
  const { bountyQueries, prClaimQueries, logger } = deps;

  if (chain.status === BOUNTY_STATUS.RESOLVED) {
    if (!chain.txHash) {
      // Resolved, but the resolving transaction could not be found (event
      // lookup failed or was capped). Unknown is neither a match nor a
      // mismatch, and deciding now would either mislabel money or close the
      // bounty with no way back. Hold both leases; a later attempt re-reads.
      logger.warn('Payout attribution unknown: resolved on-chain but resolution not found; leases held', {
        bountyId,
        claimId
      });
      return { outcome: 'pending', txHash: null, reason: 'attribution-unknown' };
    }

    // A claim the dead worker left in `processing` may own this exact
    // transaction (stolen lease only). Hash attribution beats recipient
    // attribution, so one payment is never credited to two claims.
    let strandedOwnsTx = false;
    if (stolen) {
      const attributed = await prClaimQueries.closeStrandedClaims(bountyId, {
        exceptClaimId: claimId,
        resolvedTxHash: chain.txHash,
        resolvedAt: nowMs
      });
      strandedOwnsTx = attributed > 0;
    }
    const isOurs =
      !strandedOwnsTx &&
      (sameHash(pinnedTxHash, chain.txHash) || sameAddress(chain.recipient, recipientAddress));

    if (!isOurs && !strandedOwnsTx && !recipientAddress) {
      // No wallet to compare (the reconciler, for a contributor who has
      // since unlinked) and no hash match: still unknown, not a mismatch.
      logger.warn('Payout attribution unknown: no wallet to compare; leases held', { bountyId, claimId });
      return { outcome: 'pending', txHash: null, reason: 'attribution-unknown' };
    }

    if (isOurs) {
      await prClaimQueries.settlePayout(claimId, chain.txHash, nowMs);
      await bountyQueries.settlePayout(bountyId, chain.txHash, lease);
      logger.info('Payout reconciled from chain: already resolved to this claim', {
        bountyId,
        claimId,
        txHash: chain.txHash
      });
      // `paid`, not `skipped`: the interrupted attempt never told the
      // contributor, so callers still owe them the payment notice.
      return { outcome: 'paid', txHash: chain.txHash, reconciled: true };
    }

    // Funds moved, but not to this claim. Close the bounty (the chain says
    // it is done) and fail the claim so nobody sees a green badge for money
    // they did not receive.
    await prClaimQueries.releasePayout(claimId, CLAIM_STATUS.FAILED);
    await bountyQueries.settlePayout(bountyId, chain.txHash, lease);
    logger.warn('Payout refused: bounty resolved on-chain to another claim', {
      bountyId,
      claimId,
      onchainRecipient: chain.recipient,
      onchainTxHash: chain.txHash,
      recipientAddress
    });
    const error = 'This bounty was already paid on-chain to a different wallet or pull request.';
    return failure(PAYOUT_FAILURE.RESOLVED_ELSEWHERE, error, error);
  }

  if (chain.status !== null && chain.status !== BOUNTY_STATUS.OPEN) {
    if (stolen) {
      await prClaimQueries.closeStrandedClaims(bountyId, { exceptClaimId: claimId, resolvedAt: nowMs });
    }
    await prClaimQueries.releasePayout(claimId, CLAIM_STATUS.FAILED);
    // A refunded bounty must not go back to `open`: the public feed would
    // advertise money the sponsor already took back.
    const settledStatus =
      chain.status === BOUNTY_STATUS.REFUNDED ? BOUNTY_STATUS.REFUNDED : BOUNTY_STATUS.OPEN;
    await bountyQueries.releasePayout(bountyId, lease, settledStatus);
    logger.warn('Payout refused: on-chain state does not allow payout', {
      bountyId,
      claimId,
      onchain: chain.status
    });
    const error = `Bounty is ${chain.status} on-chain; payout not possible`;
    return failure(
      PAYOUT_FAILURE.NOT_PAYABLE_ONCHAIN,
      error,
      chain.status === BOUNTY_STATUS.REFUNDED
        ? 'This bounty was refunded to the sponsor and can no longer be paid out.'
        : error
    );
  }

  return null;
}

/**
 * Reads on-chain status, normalizing the reader's two return shapes. A
 * throw is "unknown" (status null), never a reason to stop the payout.
 */
async function readChain(readOnchainStatus, { bountyId, claimId, pinnedTxHash, deps }) {
  const unknown = { status: null, recipient: null, txHash: null, pinnedPending: false };
  try {
    const read = await readOnchainStatus(bountyId, { txHash: pinnedTxHash });
    if (read && typeof read === 'object') {
      return {
        status: read.status ?? null,
        recipient: read.recipient ?? null,
        txHash: read.txHash ?? null,
        pinnedPending: read.pinnedPending === true
      };
    }
    return { ...unknown, status: read ?? null };
  } catch (error) {
    deps.logger.warn('On-chain read failed; treating chain state as unknown', {
      bountyId,
      claimId,
      error: error?.message
    });
    return unknown;
  }
}

function failure(reason, error, publicError) {
  return { outcome: 'failed', reason, error, publicError: publicError ?? null };
}

/**
 * Maps a raw send error to a sentence safe to publish, or null. Only names
 * of escrow reverts are matched; everything else is provider detail.
 */
function publishableRevert(error) {
  const text = String(error || '');
  const name = PUBLISHABLE_REVERTS.find((candidate) => text.includes(candidate));
  return name ? CONTRACT_ERROR_MESSAGES[name] : null;
}

function sameAddress(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  return a.toLowerCase() === b.toLowerCase();
}

function sameHash(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  return a.toLowerCase() === b.toLowerCase();
}
