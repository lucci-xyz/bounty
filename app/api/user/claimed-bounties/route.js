import { logger } from '@/lib/logger';
import { getSession } from '@/lib/session';
import { prClaimQueries, bountyQueries } from '@/server/db/prisma';

// Bounties in these statuses have no funds left (sponsor withdrew)
const WITHDRAWN_STATUSES = new Set(['canceled', 'refunded']);

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
        if (!bounty || WITHDRAWN_STATUSES.has(bounty.status)) {
          logger.info('Skipping claim tied to closed bounty', {
            claimId: claim.id,
            bountyId: claim.bountyId,
            bountyStatus: bounty?.status
          });
          return null;
        }
        return {
          claimId: claim.id,
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
      .filter(Boolean)
      .filter(b => b && (b.claimStatus === 'resolved' || b.claimStatus === 'paid'))
      .reduce((sum, b) => {
        const decimals = b.tokenSymbol === 'MUSD' ? 18 : 6;
        const value = Number(b.amount) / Math.pow(10, decimals);
        return sum + value;
      }, 0);

    return Response.json({
      bounties: bountiesWithClaims.filter(Boolean),
      totalEarned: Math.round(totalEarned * 100) / 100
    });
  } catch (error) {
    logger.error('Error fetching claimed bounties:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
