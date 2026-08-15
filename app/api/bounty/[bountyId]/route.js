import { logger } from '@/lib/logger';
import { bountyQueries } from '@/server/db/prisma';
import { toPublicBounty } from '@/lib/publicBounty';

export async function GET(request, { params }) {
  try {
    const { bountyId } = await params;
    const bounty = await bountyQueries.findById(bountyId);

    if (!bounty) {
      return Response.json({ error: 'Bounty not found' }, { status: 404 });
    }

    // Unauthenticated endpoint: never publish the sponsor's GitHub id.
    return Response.json(toPublicBounty(bounty));
  } catch (error) {
    logger.error('Error fetching bounty:', error);
    return Response.json({ error: 'Failed to fetch bounty' }, { status: 500 });
  }
}

