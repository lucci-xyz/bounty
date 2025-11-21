import './schema';
import { getSession } from '@/lib/session';
import { bountyQueries, prClaimQueries } from '@/server/db/prisma';

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
    
    // Calculate stats for each bounty
    const bountiesWithStats = bounties.map(b => {
      const now = Math.floor(Date.now() / 1000);
      const isExpired = b.deadline < now;
      const daysRemaining = Math.ceil((b.deadline - now) / (24 * 60 * 60));
      
      return {
        ...b,
        isExpired,
        daysRemaining: isExpired ? 0 : daysRemaining,
        claimCount: claimCounts[b.bountyId] || 0
      };
    });

    return Response.json(bountiesWithStats);
  } catch (error) {
    console.error('Error fetching user bounties:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}

