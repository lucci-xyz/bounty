import { logger } from '@/shared/lib/logger';
import { getSession } from '@/shared/lib/session';
import { bountyQueries } from '@/shared/server/db/prisma';

/**
 * POST /api/refunds/confirm
 * 
 * Updates the database status to 'refunded' after a frontend-initiated refund transaction.
 * This is called after the user successfully calls refundExpired on the contract.
 * 
 * Body: { bountyId: string, txHash: string }
 */
export async function POST(request) {
  try {
    const session = await getSession();
    if (!session || !session.githubId) {
      return Response.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const bountyId = body?.bountyId;
    const txHash = body?.txHash;
    
    if (!bountyId || !txHash) {
      return Response.json({ error: 'bountyId and txHash are required' }, { status: 400 });
    }

    const bounty = await bountyQueries.findById(bountyId);
    if (!bounty) {
      return Response.json({ error: 'Bounty not found' }, { status: 404 });
    }

    // Verify the user owns this bounty
    if (Number(bounty.sponsorGithubId) !== Number(session.githubId)) {
      return Response.json({ error: 'Not authorized to refund this bounty' }, { status: 403 });
    }

    // Update status to refunded
    await bountyQueries.updateStatus(bountyId, 'refunded', txHash);

    logger.info(`Refund confirmed in database: ${bountyId.slice(0, 10)}... -> ${txHash}`);

    return Response.json({
      success: true,
      txHash: txHash
    });
  } catch (error) {
    logger.error('Error confirming refund:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}


