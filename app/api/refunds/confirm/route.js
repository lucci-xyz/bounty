import { logger } from '@/lib/logger';
import { getSession } from '@/lib/session';
import { bountyQueries } from '@/server/db/prisma';
import { getBountyFromContract } from '@/server/blockchain/contract';

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

    if (!bounty.network) {
      return Response.json({ error: 'Bounty is missing network configuration' }, { status: 400 });
    }

    // The chain is the source of truth, not the caller.
    //
    // This route used to write 'refunded' on the caller's say-so. Because the
    // payout path skips any bounty whose status is not 'open', a sponsor could
    // post a bogus txHash to permanently block a contributor's payout while the
    // escrow was still funded and Open on-chain — collecting the merged work and
    // keeping the money.
    let onChain;
    try {
      onChain = await getBountyFromContract(bountyId, bounty.network);
    } catch (error) {
      logger.error('Refund confirm: failed to read on-chain state', {
        bountyId,
        network: bounty.network,
        error: error.message
      });
      return Response.json(
        { error: 'Could not verify the refund on-chain. Please try again.' },
        { status: 503 }
      );
    }

    if (onChain.statusString !== 'refunded') {
      logger.warn('Refund confirm rejected: bounty is not refunded on-chain', {
        bountyId,
        onChainStatus: onChain.statusString,
        githubId: session.githubId
      });
      return Response.json(
        { error: 'This bounty has not been refunded on-chain.' },
        { status: 409 }
      );
    }

    await bountyQueries.updateStatus(bountyId, 'refunded', txHash);

    logger.info(`Refund confirmed in database: ${bountyId.slice(0, 10)}... -> ${txHash}`);

    return Response.json({
      success: true,
      txHash: txHash
    });
  } catch (error) {
    logger.error('Error confirming refund:', error);
    return Response.json({ error: 'Failed to confirm refund' }, { status: 500 });
  }
}


