import { logger } from '@/shared/lib/logger';
import { getSession } from '@/shared/lib/session';
import { bountyQueries, prClaimQueries } from '@/shared/server/db/prisma';
import { getBountyFromContract } from '@/shared/server/blockchain/contract';

const CLOSED_BOUNTY_STATUSES = new Set(['closed', 'paid', 'resolved', 'refunded', 'canceled']);
const DAY_IN_SECONDS = 24 * 60 * 60;
const CONTRACT_STATUS_MAP = {
  1: 'open',
  2: 'resolved',
  3: 'refunded',
  4: 'canceled'
};

function deriveLifecycle(bounty, nowSeconds) {
  const deadlineSeconds = Number(bounty.deadline);
  const hasDeadline = Number.isFinite(deadlineSeconds);
  const deadlinePassed = hasDeadline && deadlineSeconds <= nowSeconds;
  const isClosed = CLOSED_BOUNTY_STATUSES.has(bounty.status);

  if (isClosed) {
    return {
      state: 'closed',
      label: 'Closed',
      reason: bounty.status,
      secondsRemaining: 0,
      deadline: hasDeadline ? deadlineSeconds : null
    };
  }

  if (deadlinePassed) {
    return {
      state: 'expired',
      label: 'Expired',
      reason: 'deadline_passed',
      secondsRemaining: 0,
      deadline: hasDeadline ? deadlineSeconds : null,
      expiredAt: hasDeadline ? deadlineSeconds : null
    };
  }

  return {
    state: 'open',
    label: 'Open',
    reason: 'countdown',
    secondsRemaining: hasDeadline ? Math.max(0, deadlineSeconds - nowSeconds) : null,
    deadline: hasDeadline ? deadlineSeconds : null
  };
}

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
        const onChainStatus = CONTRACT_STATUS_MAP[Number(onChain?.status)];

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
    
    // Filter out refunded bounties - they should not appear in eligible refunds
    const activeBounties = reconciledBounties.filter(
      (bounty) => bounty.status !== 'refunded'
    );
    
    const claimCounts = await prClaimQueries.countByBountyIds(
      activeBounties.map((b) => b.bountyId)
    );
    const now = Math.floor(Date.now() / 1000);

    // Calculate stats for each bounty
    const bountiesWithStats = activeBounties.map((bounty) => {
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
