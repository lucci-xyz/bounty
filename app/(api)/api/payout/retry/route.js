import { logger } from '@/shared/lib/logger';
import { getSession } from '@/shared/lib/session';
import { bountyQueries, prClaimQueries, walletQueries } from '@/shared/server/db/prisma';
import { resolveBountyOnNetwork } from '@/shared/server/blockchain/contract';

/**
 * Manually retry a failed bounty payout for the authenticated contributor.
 * Expects: { claimId: number }
 */
export async function POST(request) {
  try {
    const session = await getSession();
    if (!session?.githubId) {
      return Response.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const claimId = Number(body?.claimId);
    if (!claimId || Number.isNaN(claimId)) {
      return Response.json({ error: 'claimId is required' }, { status: 400 });
    }

    const claim = await prClaimQueries.findById(claimId);
    if (!claim) {
      return Response.json({ error: 'Claim not found' }, { status: 404 });
    }

    if (Number(claim.prAuthorGithubId) !== Number(session.githubId)) {
      return Response.json({ error: 'Not authorized to retry this payout' }, { status: 403 });
    }

    if (claim.status !== 'failed') {
      return Response.json({ error: 'Payout can only be retried for failed claims' }, { status: 400 });
    }

    const bounty = await bountyQueries.findById(claim.bountyId);
    if (!bounty) {
      return Response.json({ error: 'Bounty not found' }, { status: 404 });
    }

    const envTarget = process.env.ENV_TARGET || 'stage';
    if (bounty.environment && bounty.environment !== envTarget) {
      return Response.json({ error: 'Bounty environment mismatch' }, { status: 400 });
    }

    if (bounty.status !== 'open') {
      return Response.json({ error: 'Bounty is not open for payout' }, { status: 400 });
    }

    if (!bounty.network) {
      logger.error('Manual payout failed: bounty missing network', { bountyId: bounty.bountyId });
      return Response.json({ error: 'Bounty is missing network configuration' }, { status: 400 });
    }

    const wallet = await walletQueries.findByGithubId(session.githubId);
    if (!wallet?.walletAddress) {
      return Response.json({ error: 'Link a wallet before requesting payout' }, { status: 400 });
    }

    let result;
    try {
      result = await resolveBountyOnNetwork(bounty.bountyId, wallet.walletAddress, bounty.network);
    } catch (error) {
      logger.error('Manual payout threw', { error: error.message, bountyId: bounty.bountyId, claimId });
      result = { success: false, error: error.message || 'Unknown error during payout' };
    }

    if (!result.success) {
      await prClaimQueries.updateStatus(claim.id, 'failed');
      return Response.json({ error: result.error || 'Payout transaction failed' }, { status: 502 });
    }

    await bountyQueries.updateStatus(bounty.bountyId, 'resolved', result.txHash);
    await prClaimQueries.updateStatus(claim.id, 'paid', result.txHash, Date.now());

    return Response.json({
      success: true,
      txHash: result.txHash
    });
  } catch (error) {
    logger.error('Error processing manual payout retry:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}

