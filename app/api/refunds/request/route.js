import { logger } from '@/lib/logger';
import { getSession } from '@/lib/session';
import { bountyQueries } from '@/server/db/prisma';
import { refundExpiredOnNetwork } from '@/server/blockchain/contract';
import { handleBountyRefunded } from '@/integrations/github/webhooks';

export async function POST(request) {
  try {
    const session = await getSession();
    if (!session || !session.githubId) {
      return Response.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const bountyId = body?.bountyId;
    if (!bountyId) {
      return Response.json({ error: 'bountyId is required' }, { status: 400 });
    }

    const bounty = await bountyQueries.findById(bountyId);
    if (!bounty) {
      return Response.json({ error: 'Bounty not found' }, { status: 404 });
    }

    if (Number(bounty.sponsorGithubId) !== Number(session.githubId)) {
      return Response.json({ error: 'Not authorized to refund this bounty' }, { status: 403 });
    }

    if (bounty.status !== 'open') {
      return Response.json({ error: 'Bounty is not open' }, { status: 400 });
    }

    const now = Math.floor(Date.now() / 1000);
    if (Number(bounty.deadline) > now) {
      return Response.json({ error: 'Bounty has not expired yet' }, { status: 400 });
    }

    const result = await refundExpiredOnNetwork(bountyId, bounty.network);
    if (!result.success) {
      logger.error('Custodial refund transaction failed:', result.error);
      return Response.json({ error: result.error || 'Refund transaction failed' }, { status: 502 });
    }

    await bountyQueries.updateStatus(bountyId, 'refunded', result.txHash);

    // Post GitHub notification (non-blocking)
    if (bounty.installationId && bounty.repoFullName && bounty.issueNumber) {
      handleBountyRefunded({
        repoFullName: bounty.repoFullName,
        issueNumber: bounty.issueNumber,
        bountyId,
        amount: bounty.amount,
        txHash: result.txHash,
        installationId: bounty.installationId,
        network: bounty.network,
        tokenSymbol: bounty.tokenSymbol
      }).catch(err => {
        logger.error('Failed to post refund notification to GitHub:', err.message);
      });
    }

    return Response.json({
      success: true,
      txHash: result.txHash,
      blockNumber: result.blockNumber
    });
  } catch (error) {
    logger.error('Error processing custodial refund request:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
