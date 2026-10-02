import { logger } from '@/lib/logger';
import { getSession } from '@/lib/session';
import { bountyQueries, prClaimQueries } from '@/server/db/prisma';
import { getBountyFromContract, isRefundTransaction } from '@/server/blockchain/contract';
import { isTxHash } from '@/server/blockchain/payoutChain';

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
    if (!isTxHash(txHash)) {
      return Response.json({ error: 'txHash must be a 32-byte hex transaction hash' }, { status: 400 });
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

    // The status comes from the chain; the hash came from the caller. Store it
    // only when its receipt proves it refunded this bounty, so the explorer
    // link on the dashboard can never point at an arbitrary transaction. An
    // unverifiable hash (bogus, or a lagging RPC node) still records the
    // refund the chain already confirmed, just without a link.
    let verifiedTxHash = null;
    try {
      if (await isRefundTransaction(bountyId, bounty.network, txHash)) {
        verifiedTxHash = txHash;
      } else {
        logger.warn('Refund confirm: txHash is not this bounty\'s refund; storing none', { bountyId });
      }
    } catch (error) {
      logger.warn('Refund confirm: could not verify txHash; storing none', { bountyId, error: error.message });
    }

    await bountyQueries.updateStatus(bountyId, 'refunded', verifiedTxHash);
    // A payout in flight when the refund landed can never succeed now, and
    // with the bounty no longer `open`/`resolving` its claim can never
    // re-enter the payout guard. Close it instead of leaving it "Processing".
    await prClaimQueries.closeStrandedClaims(bountyId);

    logger.info(`Refund confirmed in database: ${bountyId.slice(0, 10)}... -> ${verifiedTxHash ?? 'unverified tx'}`);

    return Response.json({
      success: true,
      txHash: verifiedTxHash
    });
  } catch (error) {
    logger.error('Error confirming refund:', error);
    return Response.json({ error: 'Failed to confirm refund' }, { status: 500 });
  }
}


