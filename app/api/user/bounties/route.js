import { logger } from '@/lib/logger';
import { getSession } from '@/lib/session';
import { newErrorRef, publicErrorMessage } from '@/lib/errorRef';
import { bountyQueries, prClaimQueries } from '@/server/db/prisma';
import { getBountyFromContract } from '@/server/blockchain/contract';
import { deriveLifecycle, isRefundEligible } from '@/lib/status';

const DAY_IN_SECONDS = 24 * 60 * 60;

/**
 * Sync open bounty statuses with on-chain state to avoid stale DB entries.
 */
async function reconcileOpenBountyStatuses(bounties = []) {
  const openBounties = bounties.filter((bounty) => bounty.status === 'open');
  if (openBounties.length === 0) {
    return bounties;
  }

  const reconciled = await Promise.all(
    openBounties.map(async (bounty) => {
      try {
        const onChain = await getBountyFromContract(bounty.bountyId, bounty.network);
        const onChainStatus = onChain?.statusString;

        if (!onChainStatus || onChainStatus === bounty.status) {
          return bounty;
        }

        // Conditional on the row still being `open`: a payout worker may have
        // taken the `resolving` lease since the read above.
        await bountyQueries.syncOpenStatusFromChain(bounty.bountyId, onChainStatus);
        return { ...bounty, status: onChainStatus };
      } catch (error) {
        logger.warn(
          `Failed to reconcile bounty status for ${bounty.bountyId}: ${error.message}`
        );
        return bounty;
      }
    })
  );

  const reconciledMap = new Map(reconciled.map((bounty) => [bounty.bountyId, bounty]));
  return bounties.map((bounty) => reconciledMap.get(bounty.bountyId) || bounty);
}

export async function GET() {
  try {
    const session = await getSession();
    
    if (!session || !session.githubId) {
      return Response.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const bounties = await bountyQueries.findBySponsor(session.githubId);
    const reconciledBounties = await reconcileOpenBountyStatuses(bounties);
    
    const claimCounts = await prClaimQueries.countByBountyIds(
      reconciledBounties.map((b) => b.bountyId)
    );
    const now = Math.floor(Date.now() / 1000);

    // Calculate stats for each bounty
    const bountiesWithStats = reconciledBounties.map((bounty) => {
      const lifecycle = deriveLifecycle(bounty, now);
      const secondsRemaining = lifecycle.secondsRemaining ?? 0;
      const daysRemaining =
        lifecycle.state === 'open' && secondsRemaining
          ? Math.ceil(secondsRemaining / DAY_IN_SECONDS)
          : 0;

      return {
        ...bounty,
        lifecycle,
        isExpired: lifecycle.state === 'expired',
        refundEligible: isRefundEligible(bounty, now),
        daysRemaining,
        claimCount: claimCounts[bounty.bountyId] || 0
      };
    });

    return Response.json(bountiesWithStats);
  } catch (error) {
    const ref = newErrorRef();
    logger.error(`[${ref}] Error fetching user bounties:`, error);
    return Response.json({ error: publicErrorMessage(ref), ref }, { status: 500 });
  }
}
