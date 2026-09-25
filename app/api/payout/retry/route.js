import { logger } from '@/lib/logger';
import { newErrorRef, publicErrorMessage } from '@/lib/errorRef';
import { getSession } from '@/lib/session';
import { prClaimQueries } from '@/server/db/prisma';
import { settleClaim, SETTLEMENT } from '@/server/payouts';
import { announceAfterResponse } from '@/integrations/github/services/payoutAnnouncements';

// A payout waits for the transaction to confirm.
export const maxDuration = 60;

const SKIP_RESPONSES = {
  claim_not_payable: [400, 'This claim has nothing to collect: it is either unmerged or already paid.'],
  bounty_missing: [404, 'Bounty not found'],
  wrong_environment: [400, 'Bounty environment mismatch'],
  bounty_not_open: [400, 'Bounty is not open for payout'],
  merge_unverified: [409, 'A maintainer needs to confirm this merge before the payout can be sent.']
};

/**
 * Collect a merged claim's payout for the authenticated contributor: one that
 * failed, or one parked waiting for a wallet.
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

    // Defaults to contributor-settleable statuses only: never `pending`, which
    // has not been through the merge gate.
    const settlement = await settleClaim(claim);

    switch (settlement.outcome) {
      case SETTLEMENT.PAID:
        announceAfterResponse({
          claim,
          bounty: settlement.bounty,
          txHash: settlement.txHash,
          username: session.githubUsername,
          recordError: settlement.recordError
        });
        return Response.json({ success: true, txHash: settlement.txHash });

      case SETTLEMENT.NEEDS_WALLET:
        return Response.json({ error: 'Link a wallet before requesting payout' }, { status: 400 });

      case SETTLEMENT.INVALID_WALLET:
        return Response.json(
          { error: 'Your linked wallet address is not valid. Link your wallet again to collect this payout.' },
          { status: 400 }
        );

      case SETTLEMENT.NOT_ALLOWLISTED:
        logger.warn('Manual payout blocked: recipient not on sponsor allowlist', {
          bountyId: claim.bountyId,
          claimId
        });
        return Response.json(
          {
            error:
              'The sponsor restricted this bounty to specific wallet addresses, and your linked wallet is not one of them.'
          },
          { status: 403 }
        );

      case SETTLEMENT.WINDOW_CLOSED:
        return Response.json(
          {
            error: `The payout window for this bounty closed on ${new Date(settlement.closedAt * 1000).toUTCString()}. The sponsor can now reclaim the funds.`
          },
          { status: 409 }
        );

      case SETTLEMENT.CHAIN_FAILED: {
        // The raw provider error embeds the RPC URL (often with an API key).
        // It goes to the log under a reference, never to the browser.
        const ref = newErrorRef();
        logger.error(`[${ref}] Manual payout failed`, {
          claimId,
          bountyId: claim.bountyId,
          error: settlement.error
        });
        return Response.json({ error: `Payout transaction failed. ${publicErrorMessage(ref)}` }, { status: 502 });
      }

      case SETTLEMENT.NO_NETWORK:
        logger.error('Manual payout failed: bounty missing network', { bountyId: claim.bountyId });
        return Response.json({ error: 'Bounty is missing network configuration' }, { status: 400 });

      case SETTLEMENT.SKIPPED: {
        const [status, error] = SKIP_RESPONSES[settlement.reason] || [400, 'Payout not possible'];
        return Response.json({ error }, { status });
      }

      default:
        logger.error('Unhandled settlement outcome', { claimId, outcome: settlement.outcome });
        return Response.json({ error: 'Failed to process payout retry' }, { status: 500 });
    }
  } catch (error) {
    logger.error('Error processing manual payout retry:', error);
    return Response.json({ error: 'Failed to process payout retry' }, { status: 500 });
  }
}
