import { logger } from '@/lib/logger';
import { bountyQueries } from '@/server/db/prisma';
import { toPublicBounties } from '@/lib/publicBounty';

export async function GET(request, { params }) {
  try {
    const { repoId, issueNumber } = await params;
    const bounties = await bountyQueries.findByIssue(parseInt(repoId), parseInt(issueNumber));

    // Unauthenticated endpoint: never publish the sponsor's GitHub id.
    return Response.json({ bounties: toPublicBounties(bounties) });
  } catch (error) {
    logger.error('Error fetching issue bounties:', error);
    return Response.json({ error: 'Failed to fetch issue bounties' }, { status: 500 });
  }
}

