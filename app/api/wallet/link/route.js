import { after } from 'next/server';
import { logger } from '@/lib/logger';
import { getSession } from '@/lib/session';
import { walletQueries } from '@/server/db/prisma';
import { settleContributorClaims, SETTLEMENT, toPublicSettlement } from '@/server/payouts';
import { announceSettledClaim } from '@/integrations/github/services/payoutAnnouncements';

// Linking may settle waiting payouts, each of which waits for confirmation.
export const maxDuration = 60;

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
      const results = await settleContributorClaims(session.githubId);

      for (const result of results) {
        if (result.outcome === SETTLEMENT.PAID) {
          if (result.recordError) {
            logger.error('Payout on wallet link sent but not recorded', {
              claimId: result.claimId,
              txHash: result.txHash,
              error: result.recordError.message
            });
          }
          after(() =>
            announceSettledClaim({
              claim: result.claim,
              bounty: result.bounty,
              txHash: result.txHash,
              username: session.githubUsername
            })
          );
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
