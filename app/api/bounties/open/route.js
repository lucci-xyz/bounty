import { logger } from '@/lib/logger';
import { bountyQueries } from '@/server/db/prisma';
import { toPublicBounties } from '@/lib/publicBounty';

export async function GET() {
  try {
    const bounties = await bountyQueries.findAllOpen();
    // Unauthenticated endpoint: never publish the sponsor's GitHub id.
    return Response.json(toPublicBounties(bounties));
  } catch (error) {
    logger.error('Error fetching open bounties:', error);
    return Response.json({ error: 'Failed to fetch open bounties' }, { status: 500 });
  }
}

