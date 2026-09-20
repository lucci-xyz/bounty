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
  let onchain = null;
  try {
    onchain = await readOnchainStatus(bountyId);
  } catch (error) {
    logger.warn('On-chain pre-send read failed; proceeding with payout', {
      bountyId,
      claimId,
      error: error?.message
    });
  }
  if (onchain === BOUNTY_STATUS.RESOLVED) {
    await prClaimQueries.settlePayout(claimId, null, nowMs);
    await bountyQueries.settlePayout(bountyId, null);
    logger.info('Payout skipped: bounty already resolved on-chain; rows reconciled', {
      bountyId,
      claimId
    });
    return { outcome: 'skipped', reason: 'already-paid' };
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

  const error = (result && result.error) || 'Unknown error during resolution';
  await prClaimQueries.releasePayout(claimId, CLAIM_STATUS.FAILED);
  await bountyQueries.releasePayout(bountyId);
  logger.warn('Payout failed; rows released for retry', { bountyId, claimId });
  return { outcome: 'failed', error };
}
