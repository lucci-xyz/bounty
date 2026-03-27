import { logger } from '@/lib/logger';
import { bountyQueries } from '@/server/db/prisma';

export async function GET(request) {
  try {
    const bounties = await bountyQueries.findAllOpen();
    return Response.json(bounties);
  } catch (error) {
    logger.error('Error fetching open bounties:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

