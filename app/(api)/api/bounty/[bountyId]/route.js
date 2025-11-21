import './schema';
import { bountyQueries } from '@/shared/server/db/prisma';

export async function GET(request, { params }) {
  try {
    const { bountyId } = await params;
    const bounty = await bountyQueries.findById(bountyId);

    if (!bounty) {
      return Response.json({ error: 'Bounty not found' }, { status: 404 });
    }

    return Response.json(bounty);
  } catch (error) {
    console.error('Error fetching bounty:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}

