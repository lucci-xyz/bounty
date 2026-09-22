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
 * Before sending, the worker re-reads the bounty's on-chain status: a prior
 * send may have confirmed without being recorded (crash or receipt failure
 * between broadcast and settle), and the chain is the authority on whether
 * funds moved. An unreadable chain fails open toward liveness so RPC
 * flakiness cannot block every payout.
 *
 * "Resolved on-chain" is not "resolved to this claimant". Two PRs can claim
 * one bounty, so a resolved bounty only marks this claim `paid` when the
 * on-chain recipient matches this claim's wallet. Any other resolution
 * settles the bounty row and fails the claim with a message that says so.
 *
 * A send whose receipt does not arrive in time is not a failure: the
 * transaction is on the network and may still mine. The guard records the
 * hash on the claim, keeps both leases, and returns `pending`; the next
 * attempt steals the stale lease and reconciles from chain.
 *
 * Dependency-free except a relative import of lib/status (which itself has
 * no imports), so the orchestration can be tested directly under node --test
 * with injected query fakes — the same pattern as
 * integrations/github/webhookAuth.js. Status strings stay canonical in
 * lib/status; see CLAIM_STATUS and BOUNTY_STATUS there.
 */
import { BOUNTY_STATUS, CLAIM_STATUS } from '../../lib/status/index.js';

/**
 * Settles one claim's payout.
 *
 * @param {object} params
 * @param {number} params.claimId
 * @param {string} params.bountyId
 * @param {string} params.recipientAddress
 * @param {number} [params.nowMs] - clock injection for tests
 * @param {object} deps - injected collaborators (real query namespaces,
 *   chain sender, and on-chain reader in production; fakes in tests)
 * @returns {Promise<object>} `{ outcome: 'paid', txHash }`,
 *   `{ outcome: 'pending', txHash }` (broadcast, unconfirmed, leases held),
 *   `{ outcome: 'failed', error }`, or `{ outcome: 'skipped', reason }`.
 */
export async function settleClaim(
  { claimId, bountyId, recipientAddress, nowMs = Date.now() },
  deps
) {
  const { bountyQueries, prClaimQueries, resolveBounty, readOnchainStatus, logger } = deps;

  const bountyAcquired = await bountyQueries.tryAcquireForPayout(bountyId, nowMs);
  if (!bountyAcquired.acquired) {
    logger.info('Payout skipped: bounty already handled or in flight', { bountyId, claimId });
    return { outcome: 'skipped', reason: 'bounty-not-acquirable' };
  }

  const claimAcquired = await prClaimQueries.tryAcquireForPayout(claimId, {
    includeProcessing: bountyAcquired.stolen
  });
  if (!claimAcquired) {
    const claim = await prClaimQueries.findById(claimId);
    if (claim && claim.status === CLAIM_STATUS.PAID) {
      // Crash window: the transaction confirmed and the claim row flipped,
      // but the bounty row never did. Finish the bookkeeping, never re-send:
      // a `paid` claim means funds already moved.
      await bountyQueries.settlePayout(bountyId, claim.txHash);
      logger.info('Payout skipped: claim already paid; bounty reconciled', { bountyId, claimId });
      return { outcome: 'skipped', reason: 'already-paid' };
    }
    await bountyQueries.releasePayout(bountyId);
    logger.info('Payout skipped: claim not payable', { bountyId, claimId });
    return { outcome: 'skipped', reason: 'claim-not-acquirable' };
  }

  // Read-before-write recovery: a prior send may have confirmed without
  // being recorded. Never re-send into a resolved bounty; refuse when the
  // on-chain state disallows payout. Unknown (read error) proceeds.
  //
  // `readOnchainStatus` may return a bare status string or
  // `{ status, recipient, txHash }`; the recipient is what lets a resolved
  // bounty be attributed to this claim rather than assumed.
  let onchain = null;
  let onchainRecipient = null;
  let onchainTxHash = null;
  try {
    const read = await readOnchainStatus(bountyId);
    if (read && typeof read === 'object') {
      onchain = read.status ?? null;
      onchainRecipient = read.recipient ?? null;
      onchainTxHash = read.txHash ?? null;
    } else {
      onchain = read ?? null;
    }
  } catch (error) {
    logger.warn('On-chain pre-send read failed; proceeding with payout', {
      bountyId,
      claimId,
      error: error?.message
    });
  }
  if (onchain === BOUNTY_STATUS.RESOLVED) {
    if (sameAddress(onchainRecipient, recipientAddress)) {
      await prClaimQueries.settlePayout(claimId, onchainTxHash, nowMs);
      await bountyQueries.settlePayout(bountyId, onchainTxHash);
      logger.info('Payout skipped: bounty already resolved on-chain to this claimant; rows reconciled', {
        bountyId,
        claimId,
        txHash: onchainTxHash
      });
      return { outcome: 'skipped', reason: 'already-paid' };
    }
    // Funds moved, but not provably to this claimant. Close the bounty (the
    // chain says it is done) and fail the claim so nobody sees a green badge
    // for money they did not receive.
    await prClaimQueries.releasePayout(claimId, CLAIM_STATUS.FAILED);
    await bountyQueries.settlePayout(bountyId, onchainTxHash);
    const error = onchainRecipient
      ? `Bounty was already paid on-chain to ${onchainRecipient}; this claim cannot be paid`
      : 'Bounty is already resolved on-chain but the recipient could not be verified';
    logger.warn('Payout refused: bounty resolved on-chain to another or unverified recipient', {
      bountyId,
      claimId,
      onchainRecipient,
      recipientAddress
    });
    return { outcome: 'failed', error };
  }
  if (onchain !== null && onchain !== BOUNTY_STATUS.OPEN) {
    await prClaimQueries.releasePayout(claimId, CLAIM_STATUS.FAILED);
    await bountyQueries.releasePayout(bountyId);
    logger.warn('Payout refused: on-chain state does not allow payout', {
      bountyId,
      claimId,
      onchain
    });
    return { outcome: 'failed', error: `Bounty is ${onchain} on-chain; payout not possible` };
  }

  let result;
  try {
    result = await resolveBounty(bountyId, recipientAddress);
  } catch (error) {
    result = { success: false, error: error?.message || 'Unknown error during resolution' };
  }

  if (result && result.success) {
    // Claim row first: a crash here leaves claim=paid + bounty=resolving,
    // which the steal path reconciles. The reverse order would leave
    // bounty=resolved + claim=processing, which is unrecoverable.
    await prClaimQueries.settlePayout(claimId, result.txHash, nowMs);
    await bountyQueries.settlePayout(bountyId, result.txHash);
    logger.info('Payout settled', { bountyId, claimId, txHash: result.txHash });
    return { outcome: 'paid', txHash: result.txHash };
  }

  if (result && result.unconfirmed && result.txHash) {
    // Broadcast, no receipt yet. Releasing here would invite a second send
    // while the first may still mine. Hold both leases, pin the hash to the
    // claim, and let the next attempt reconcile from chain once the lease
    // is stale.
    await prClaimQueries.recordPayoutTx(claimId, result.txHash);
    logger.warn('Payout broadcast but unconfirmed; leases held for reconciliation', {
      bountyId,
      claimId,
      txHash: result.txHash
    });
    return { outcome: 'pending', txHash: result.txHash };
  }

  const error = (result && result.error) || 'Unknown error during resolution';
  await prClaimQueries.releasePayout(claimId, CLAIM_STATUS.FAILED);
  await bountyQueries.releasePayout(bountyId);
  logger.warn('Payout failed; rows released for retry', { bountyId, claimId });
  return { outcome: 'failed', error };
}

function sameAddress(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  return a.toLowerCase() === b.toLowerCase();
}
