import { logger } from '@/shared/lib/logger';
import { getSession } from '@/shared/lib/session';
import { bountyQueries, prClaimQueries } from '@/shared/server/db/prisma';

const CLOSED_BOUNTY_STATUSES = new Set(['closed', 'paid', 'resolved', 'refunded']);
const DAY_IN_SECONDS = 24 * 60 * 60;

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

export async function GET(request) {
  try {
    const session = await getSession();
    
    if (!session || !session.githubId) {
      return Response.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const bounties = await bountyQueries.findBySponsor(session.githubId);
    const claimCounts = await prClaimQueries.countByBountyIds(
      bounties.map((b) => b.bountyId)
    );
    const now = Math.floor(Date.now() / 1000);

    // Calculate stats for each bounty
    const bountiesWithStats = bounties.map((bounty) => {
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

