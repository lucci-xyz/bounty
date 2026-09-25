import { logger } from '@/lib/logger';
import { getSession } from '@/lib/session';
import { walletQueries } from '@/server/db/prisma';
import { settleContributorClaims, SETTLEMENT, toPublicSettlement } from '@/server/payouts';
import { announceAfterResponse } from '@/integrations/github/services/payoutAnnouncements';

// Linking may settle waiting payouts, each of which waits for confirmation.
export const maxDuration = 60;

// Start no new transfer after this long, leaving the rest of maxDuration for
// the last one to confirm and be recorded. Unstarted claims wait for the
// dashboard's "Collect payout".
const SETTLEMENT_BUDGET_MS = 20_000;

// Links the SIWE-verified wallet in the session to the OAuth-verified GitHub
// identity in the session. Inputs are taken exclusively from the session —
// the request body is ignored — so a caller cannot link a wallet to anyone
// else's GitHub account or overwrite another user's wallet mapping.
//
// Linking also settles the contributor's merged-but-unpaid claims. When a PR
// merges before its author has linked a wallet, the bot tells them to link
// one; this is where that promise is kept. Only claims already through the
// merge gate (pending_wallet, failed) and belonging to the session's GitHub
// identity are touched.
export async function POST() {
  try {
    const session = await getSession();

    if (!session.githubId || !session.githubUsername) {
      return Response.json({ error: 'Not authenticated' }, { status: 401 });
    }

    if (!session.walletAddress) {
      return Response.json({ error: 'Wallet not authenticated' }, { status: 401 });
    }

    await walletQueries.create(
      session.githubId,
      session.githubUsername,
      session.walletAddress
    );

    // The link has succeeded whatever happens below; a settlement problem
    // must not report it as failed.
    let payouts = [];
    try {
      const results = await settleContributorClaims(session.githubId, { budgetMs: SETTLEMENT_BUDGET_MS });

      for (const result of results) {
        if (result.outcome === SETTLEMENT.PAID) {
          announceAfterResponse({
            claim: result.claim,
            bounty: result.bounty,
            txHash: result.txHash,
            username: session.githubUsername,
            recordError: result.recordError
          });
        } else if (result.outcome !== SETTLEMENT.SKIPPED) {
          logger.warn('Payout on wallet link not completed', {
            claimId: result.claimId,
            outcome: result.outcome,
            error: result.error?.message || result.error
          });
        }
      }

      payouts = results.map(toPublicSettlement);
    } catch (error) {
      logger.error('Error settling payouts after wallet link:', error);
    }

    return Response.json({ success: true, payouts });
  } catch (error) {
    logger.error('Error linking wallet:', error);
    return Response.json({ error: 'Failed to link wallet' }, { status: 500 });
  }
}
