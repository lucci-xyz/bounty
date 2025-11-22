import { logger } from '@/shared/lib/logger';
import { getSession } from '@/shared/lib/session';
import { prClaimQueries, bountyQueries } from '@/shared/server/db/prisma';

export async function GET(request) {
  try {
    const session = await getSession();
    
    if (!session || !session.githubId) {
      return Response.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Get all PR claims for this user
    const claims = await prClaimQueries.findByContributor(session.githubId);
    
    // Fetch bounty details for each claim
    const bountiesWithClaims = await Promise.all(
      claims.map(async (claim) => {
        const bounty = await bountyQueries.findById(claim.bountyId);
        return {
          ...bounty,
          claimStatus: claim.status,
          prNumber: claim.prNumber,
          claimCreatedAt: claim.createdAt,
          paidAt: claim.resolvedAt,
          txHash: claim.txHash
        };
      })
    );

    // Calculate total earned (only resolved/paid bounties)
    const totalEarned = bountiesWithClaims
      .filter(b => b && (b.claimStatus === 'resolved' || b.claimStatus === 'paid'))
      .reduce((sum, b) => {
        const decimals = b.tokenSymbol === 'MUSD' ? 18 : 6;
        const value = Number(b.amount) / Math.pow(10, decimals);
        return sum + value;
      }, 0);

    return Response.json({
      bounties: bountiesWithClaims.filter(b => b !== null),
      totalEarned: Math.round(totalEarned * 100) / 100
    });
  } catch (error) {
    logger.error('Error fetching claimed bounties:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}

