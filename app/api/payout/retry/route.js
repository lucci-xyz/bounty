import { logger } from '@/lib/logger';
import { getSession } from '@/lib/session';
import { bountyQueries, prClaimQueries, walletQueries, allowlistQueries } from '@/server/db/prisma';
import { resolveBountyOnNetwork, readBountyOnchainStatus } from '@/server/blockchain/contract';
import { settleClaim } from '@/server/payouts/settleClaim';
import { CLAIM_STATUS } from '@/lib/status';

/**
 * Manually retry a failed or pending-wallet bounty payout for the
 * authenticated contributor.
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

    if (claim.status !== CLAIM_STATUS.FAILED && claim.status !== CLAIM_STATUS.PENDING_WALLET) {
      return Response.json({ error: 'Payout can only be retried for failed or pending-wallet claims' }, { status: 400 });
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

    // Same sponsor allowlist gate as the webhook payout path.
    const allowlistCheck = await allowlistQueries.checkAllowed(bounty.bountyId, wallet.walletAddress);
    if (!allowlistCheck.allowed) {
      logger.warn('Manual payout blocked: recipient not on sponsor allowlist', {
        bountyId: bounty.bountyId,
        claimId
      });
      return Response.json(
        {
          error:
            'The sponsor restricted this bounty to specific wallet addresses, and your linked wallet is not one of them.'
        },
        { status: 403 }
      );
    }

    const settlement = await settleClaim(
      {
        claimId: claim.id,
        bountyId: bounty.bountyId,
        recipientAddress: wallet.walletAddress
      },
      {
        bountyQueries,
        prClaimQueries,
        resolveBounty: (id, recipient) => resolveBountyOnNetwork(id, recipient, bounty.network),
        readOnchainStatus: (id) => readBountyOnchainStatus(id, bounty.network),
        logger
      }
    );

    if (settlement.outcome === 'skipped') {
      return Response.json({ error: 'Payout is already in progress or completed' }, { status: 409 });
    }

    if (settlement.outcome === 'failed') {
      return Response.json({ error: settlement.error || 'Payout transaction failed' }, { status: 502 });
    }

    return Response.json({
      success: true,
      txHash: settlement.txHash
    });
  } catch (error) {
    logger.error('Error processing manual payout retry:', error);
    return Response.json({ error: 'Failed to process payout retry' }, { status: 500 });
  }
}

