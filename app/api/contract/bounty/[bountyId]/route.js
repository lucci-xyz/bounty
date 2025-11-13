import { bountyQueries } from '@/server/db/postgres';
import { getBountyFromContract } from '@/server/blockchain/contract';

export async function GET(request, { params }) {
  try {
    const { bountyId } = await params;
    // Determine network from DB
    const row = await bountyQueries.findById(bountyId);
    const network = row?.network || 'BASE_SEPOLIA';
    const bounty = await getBountyFromContract(bountyId, network);
    return Response.json(bounty);
  } catch (error) {
    console.error('Error fetching contract bounty:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}

