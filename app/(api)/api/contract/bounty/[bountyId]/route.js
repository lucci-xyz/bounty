import { logger } from '@/shared/lib/logger';
import { bountyQueries } from '@/shared/server/db/prisma';
import { getBountyFromContract } from '@/shared/server/blockchain/contract';

export async function GET(request, { params }) {
  try {
    const { bountyId } = await params;
    // Determine network from DB
    const row = await bountyQueries.findById(bountyId);
    if (!row?.network) {
      return Response.json(
        { error: 'Bounty has no network configured. Cannot fetch on-chain data.' },
        { status: 400 }
      );
    }
    const network = row.network;
    const bounty = await getBountyFromContract(bountyId, network);
    return Response.json(bounty);
  } catch (error) {
    logger.error('Error fetching contract bounty:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}

