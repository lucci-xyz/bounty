import { logger } from '@/lib/logger';
import { getSession } from '@/lib/session';
import { bountyQueries } from '@/server/db/prisma';
import { verifyRefundConfirmationOnNetwork } from '@/server/blockchain/contract';
import { handleBountyRefunded } from '@/integrations/github/webhooks';
import { getRepositoryInstallationId } from '@/integrations/github/client';

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

    if (bounty.status !== 'open') {
      return Response.json({ error: 'Bounty is not open' }, { status: 400 });
    }

    if (!bounty.network) {
      return Response.json({ error: 'Bounty is missing network configuration' }, { status: 400 });
    }

    const verification = await verifyRefundConfirmationOnNetwork(bountyId, txHash, bounty.network);
    if (!verification.verified) {
      return Response.json({ error: verification.reason || 'Refund transaction could not be verified' }, { status: 400 });
    }

    // Update status to refunded
    await bountyQueries.updateStatus(bountyId, 'refunded', txHash);

    if (bounty.repoFullName && bounty.issueNumber) {
      const [owner, repo] = bounty.repoFullName.split('/');
      try {
        const installationId = await getRepositoryInstallationId(owner, repo);
        await handleBountyRefunded({
          repoFullName: bounty.repoFullName,
          issueNumber: bounty.issueNumber,
          bountyId,
          amount: bounty.amount,
          txHash,
          installationId,
          network: bounty.network,
          tokenSymbol: bounty.tokenSymbol
        });
      } catch (notifyError) {
        logger.warn('Refund confirmed, but GitHub notification failed:', notifyError.message);
      }
    }

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

