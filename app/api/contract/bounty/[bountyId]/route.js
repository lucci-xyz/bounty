import { logger } from '@/lib/logger';
import { newErrorRef, publicErrorMessage } from '@/lib/errorRef';
import { bountyQueries } from '@/server/db/prisma';
import { getBountyFromContract } from '@/server/blockchain/contract';

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
    const ref = newErrorRef();
    logger.error(`[${ref}] Error fetching contract bounty:`, error);
    return Response.json({ error: publicErrorMessage(ref), ref }, { status: 500 });
  }
}

