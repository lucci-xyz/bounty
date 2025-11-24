import { logger } from '@/shared/lib/logger';
import { getSession } from '@/shared/lib/session';
import { bountyQueries } from '@/shared/server/db/prisma';
import { getBountyFromContract } from '@/shared/server/blockchain/contract';

export async function POST(request) {
  try {
    const session = await getSession();
    if (!session?.githubId) {
      return Response.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const bountyId = body?.bountyId;
    const txHash = body?.txHash;

    if (!bountyId) {
      return Response.json({ error: 'bountyId is required' }, { status: 400 });
    }

    const bounty = await bountyQueries.findById(bountyId);
    if (!bounty) {
      return Response.json({ error: 'Bounty not found' }, { status: 404 });
    }

    const callerGithubId = Number(session.githubId);
    if (Number(bounty.sponsorGithubId) !== callerGithubId) {
      return Response.json({ error: 'Not authorized to update this bounty' }, { status: 403 });
    }

    const onChain = await getBountyFromContract(bountyId, bounty.network);
    if (Number(onChain?.status) !== 3) {
      return Response.json({ error: 'Bounty is not refunded on-chain yet' }, { status: 400 });
    }

    await bountyQueries.updateStatus(bountyId, 'refunded', txHash || bounty.txHash);

    return Response.json({ success: true });
  } catch (error) {
    logger.error('Error confirming refund completion:', error);
    return Response.json({ error: error.message || 'Failed to record refund' }, { status: 500 });
  }
}
