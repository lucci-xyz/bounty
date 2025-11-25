import { logger } from '@/shared/lib/logger';
import { getSession } from '@/shared/lib/session';
import { bountyQueries, prClaimQueries } from '@/shared/server/db/prisma';
import { getBountyFromContract } from '@/shared/server/blockchain/contract';
import { deriveLifecycle, isRefundEligible, contractStatusToDb } from '@/shared/lib/status';

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

        const updated = await bountyQueries.updateStatus(bounty.bountyId, onChainStatus);
        return updated || { ...bounty, status: onChainStatus };
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

export async function GET(request) {
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
    logger.error('Error fetching user bounties:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
