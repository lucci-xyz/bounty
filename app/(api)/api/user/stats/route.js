import { logger } from '@/shared/lib/logger';
import { getSession } from '@/shared/lib/session';
import { bountyQueries, prClaimQueries } from '@/shared/server/db/prisma';

export async function GET(request) {
  try {
    const session = await getSession();
    
    if (!session || !session.githubId) {
      return Response.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const bounties = await bountyQueries.findBySponsor(session.githubId);
    
    const stats = {
      totalBounties: bounties.length,
      openBounties: bounties.filter(b => b.status === 'open').length,
      resolvedBounties: bounties.filter(b => b.status === 'resolved').length,
      refundedBounties: bounties.filter(b => b.status === 'refunded').length,
      totalValueLocked: 0,
      totalValuePaid: 0
    };
    
    // Calculate TVL and total paid
    bounties.forEach(b => {
      const decimals = b.tokenSymbol === 'MUSD' ? 18 : 6;
      const value = Number(b.amount) / Math.pow(10, decimals);
      
      if (b.status === 'open') {
        stats.totalValueLocked += value;
      } else if (b.status === 'resolved') {
        stats.totalValuePaid += value;
      }
    });
    
    // Round to 2 decimals
    stats.totalValueLocked = Math.round(stats.totalValueLocked * 100) / 100;
    stats.totalValuePaid = Math.round(stats.totalValuePaid * 100) / 100;

    // Count unique contributors who were paid for resolved bounties
    const resolvedBountyIds = bounties
      .filter(b => b.status === 'resolved')
      .map(b => b.bountyId);
    
    const uniqueContributors = await prClaimQueries.countUniquePaidContributors(resolvedBountyIds);
    
    // Replace resolvedBounties count with unique contributors count
    stats.resolvedBounties = uniqueContributors;

    return Response.json(stats);
  } catch (error) {
    logger.error('Error fetching user stats:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}

