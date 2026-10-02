import { logger } from '@/lib/logger';
import { bountyQueries, prClaimQueries, walletQueries } from '@/server/db/prisma';
import { readBountyOnchainResolution } from '@/server/blockchain/contract';
import { reconcileStaleLeases } from '@/server/payouts/reconcileStaleLeases';
import { getOctokitForRepo } from '@/integrations/github/client';
import { announcePayment } from '@/integrations/github/services/paymentAnnouncement';

// Settles payout leases nobody came back for: a worker that died, or a send
// that never confirmed while nobody retried. Reconcile-only: it records what
// the chain already decided and never sends a transaction. See
// server/payouts/reconcileStaleLeases.js.
//
// Authentication FAILS CLOSED, like the other cron routes: it writes payout
// state and posts to GitHub, so it must never be publicly invocable.
const CRON_SECRET = process.env.CRON_SECRET;

// Stop starting new rows well inside the platform's default function budget
// (this project's plan rejects a `maxDuration` override). Rows left over are
// picked up, oldest first, on the next run.
const RUN_BUDGET_MS = 7_000;

export async function GET(request) {
  try {
    if (!CRON_SECRET) {
      logger.error('[cron/reconcile-payouts] CRON_SECRET is not configured; refusing to run');
      return Response.json({ error: 'Not configured' }, { status: 503 });
    }
    if (request.headers.get('authorization') !== `Bearer ${CRON_SECRET}`) {
      logger.warn('[cron/reconcile-payouts] Unauthorized cron request');
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const results = await reconcileStaleLeases(
      { deadlineMs: Date.now() + RUN_BUDGET_MS },
      {
        bountyQueries,
        prClaimQueries,
        walletQueries,
        readOnchainStatus: (bounty, bountyId, options) =>
          readBountyOnchainResolution(bountyId, bounty.network, options),
        announcePayment: async ({ bounty, claim, txHash }) => {
          const [owner, repo] = claim.repoFullName.split('/');
          const octokit = await getOctokitForRepo(claim.repoFullName);
          await announcePayment({
            octokit,
            owner,
            repo,
            prNumber: claim.prNumber,
            bounty,
            contributorGithubId: claim.prAuthorGithubId,
            txHash
          });
        },
        logger
      }
    );

    const counts = results.reduce((acc, { outcome }) => {
      acc[outcome] = (acc[outcome] || 0) + 1;
      return acc;
    }, {});
    logger.info('[cron/reconcile-payouts] Done', counts);
    return Response.json({ success: true, reconciled: results.length, counts });
  } catch (error) {
    logger.error('[cron/reconcile-payouts] Error:', error.message);
    return Response.json({ success: false, error: 'Payout reconciliation failed' }, { status: 500 });
  }
}
