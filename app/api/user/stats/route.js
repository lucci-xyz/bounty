import { logger } from '@/lib/logger';
import { getSession } from '@/lib/session';
import { bountyQueries, prClaimQueries } from '@/server/db/prisma';
import { REGISTRY } from '@/config/chain-registry';

function getTokenDecimalsForBounty(bounty) {
  const network = bounty?.network;
  const tokenAddress = bounty?.token;
  const config = network ? REGISTRY?.[network] : null;
  if (!config || !tokenAddress) return 6;

  const tokens = [config.token, ...(config.additionalTokens || [])].filter(Boolean);
  const match = tokens.find((t) => t?.address?.toLowerCase() === tokenAddress.toLowerCase());
  return match?.decimals ?? config.token?.decimals ?? 6;
}

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
      const decimals = getTokenDecimalsForBounty(b);
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

