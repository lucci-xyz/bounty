import { bountyQueries } from '@/server/db/prisma';

export async function GET(request) {
  try {
    const bounties = await bountyQueries.findAllOpen();
    return Response.json(bounties);
  } catch (error) {
    console.error('Error fetching open bounties:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}

