/**
 * Backstop for payout leases nobody came back for.
 *
 * The guard recovers a dead or unconfirmed payout on the next attempt, but an
 * attempt only comes from a merge redelivery or the contributor's retry
 * button. Without one, a `resolving` bounty and its `processing` claim sit
 * there indefinitely. This runs on a schedule and settles each stale lease
 * through the same guard, in reconcile-only mode: it records what the chain
 * already decided and never sends a transaction itself. A send that never
 * reached the chain is handed back as `failed` so the contributor can retry
 * through the normal, gated path.
 *
 * Dependency-free except a relative import of settleClaim, so it can be
 * tested directly under node --test with injected fakes.
 */
import { settleClaim } from './settleClaim.js';
import { CLAIM_STATUS } from '../../lib/status/index.js';

/**
 * Reconciles every stale payout lease, oldest first.
 *
 * @param {object} [params]
 * @param {number} [params.nowMs]
 * @param {number} [params.limit] - max bounties per run
 * @param {number} [params.deadlineMs] - wall-clock time after which no new
 *   bounty is started; the rest wait for the next run
 * @param {object} deps - { bountyQueries, prClaimQueries, walletQueries,
 *   readOnchainStatus(bounty, bountyId, options), announcePayment({ bounty,
 *   claim, txHash }), logger }
 * @returns {Promise<Array<{bountyId: string, claimId: number|null, outcome: string, reason?: string}>>}
 */
export async function reconcileStaleLeases({ nowMs = Date.now(), limit = 25, deadlineMs = Infinity } = {}, deps) {
  const { bountyQueries, prClaimQueries, walletQueries, readOnchainStatus, announcePayment, logger } = deps;
  const results = [];

  for (const bounty of await bountyQueries.findStaleResolving(nowMs, limit)) {
    if (Date.now() >= deadlineMs) break;
    const { bountyId } = bounty;
    try {
      const claim = pickClaim(await prClaimQueries.findByBountyId(bountyId));

      if (!claim) {
        // The worker died between taking the bounty lease and the claim:
        // nothing was sent. Steal the stale lease and hand the bounty back.
        const { acquired, stolen, lease } = await bountyQueries.tryAcquireForPayout(bountyId, nowMs);
        if (acquired) await bountyQueries.releasePayout(bountyId, lease);
        results.push({ bountyId, claimId: null, outcome: acquired && stolen ? 'released' : 'skipped' });
        continue;
      }

      const wallet = await walletQueries.findByGithubId(claim.prAuthorGithubId);
      const settlement = await settleClaim(
        {
          claimId: claim.id,
          bountyId,
          recipientAddress: wallet?.walletAddress ?? null,
          nowMs,
          allowSend: false
        },
        {
          bountyQueries,
          prClaimQueries,
          resolveBounty: () => {
            throw new Error('The reconciler never sends');
          },
          readOnchainStatus: (id, options) => readOnchainStatus(bounty, id, options),
          logger
        }
      );

      if (settlement.outcome === 'paid') {
        // The interrupted attempt never announced the payment. Best-effort:
        // the rows are already correct, so an announcement failure is logged,
        // not retried into a second settlement.
        try {
          await announcePayment({ bounty, claim, txHash: settlement.txHash });
        } catch (error) {
          logger.warn('Reconciled payout could not be announced', {
            bountyId,
            claimId: claim.id,
            error: error?.message
          });
        }
      }

      results.push({ bountyId, claimId: claim.id, outcome: settlement.outcome, reason: settlement.reason });
    } catch (error) {
      // One bad row must not stop the sweep.
      logger.error('Reconciling a stale payout lease failed', { bountyId, error: error?.message });
      results.push({ bountyId, claimId: null, outcome: 'error' });
    }
  }

  return results;
}

/**
 * The claim the dead worker was paying: a `processing` claim (one with a
 * pinned transaction first), else a `paid` claim whose bounty row never
 * flipped. Any other claim was never in the payout.
 */
function pickClaim(claims) {
  const processing = claims.filter((claim) => claim.status === CLAIM_STATUS.PROCESSING);
  return (
    processing.find((claim) => claim.txHash) ??
    processing[0] ??
    claims.find((claim) => claim.status === CLAIM_STATUS.PAID) ??
    null
  );
}
