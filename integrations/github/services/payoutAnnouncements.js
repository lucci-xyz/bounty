import { after } from 'next/server';
import { logger } from '@/lib/logger';
import { newErrorRef, publicErrorMessage } from '@/lib/errorRef';
import { getRepoOctokit, postIssueComment, updateComment } from '../client.js';
import { notifyMaintainers } from './maintainerAlerts.js';
import { formatAmountByToken, networkMeta } from './bountyFormatting.js';
import { renderPaymentSentComment, renderBountyResolvedComment } from '../templates/bounties';
import { BRAND_SIGNATURE, FRONTEND_BASE, OG_ICON } from '../constants.js';
import { userQueries } from '@/server/db/prisma.js';
import { sendBountyPaidEmail } from '@/integrations/email/email.js';

/**
 * Announce a completed payout: a comment on the pull request, the pinned bounty
 * summary on the issue, and an email to the contributor.
 *
 * Every step is best-effort and independent. The funds have already moved, so a
 * GitHub or SMTP failure here must neither throw into the caller (which could
 * abandon the next claim's payout) nor stop the remaining steps.
 *
 * @param {object} params
 * @param {object|null} params.octokit Installation client for the repo; GitHub steps are skipped without one.
 * @param {string} params.repoFullName
 * @param {number} params.prNumber
 * @param {string} params.username Contributor's GitHub login.
 * @param {number} params.contributorGithubId
 * @param {object} params.bounty
 * @param {string} params.txHash
 */
export async function announcePayout({ octokit, repoFullName, prNumber, username, contributorGithubId, bounty, txHash }) {
  const [owner, repo] = repoFullName.split('/');
  const tokenSymbol = bounty.tokenSymbol || 'UNKNOWN';
  const amountFormatted = formatAmountByToken(bounty.amount, tokenSymbol);

  let txUrl = null;
  try {
    txUrl = networkMeta(bounty.network).explorerTx(txHash);
  } catch (error) {
    logger.warn('Payout announcement: no explorer for network', { network: bounty.network, error: error.message });
  }

  const commentFields = {
    iconUrl: OG_ICON,
    username,
    amountFormatted,
    tokenSymbol,
    txUrl,
    brandSignature: BRAND_SIGNATURE
  };

  const steps = [
    [
      'payment comment',
      () => octokit && txUrl && postIssueComment(octokit, owner, repo, prNumber, renderPaymentSentComment(commentFields))
    ],
    [
      'pinned summary',
      () =>
        octokit &&
        txUrl &&
        bounty.pinnedCommentId &&
        updateComment(octokit, owner, repo, bounty.pinnedCommentId, renderBountyResolvedComment(commentFields))
    ],
    [
      'paid email',
      async () => {
        const contributor = await userQueries.findByGithubId(contributorGithubId);
        if (!contributor?.email) return;
        await sendBountyPaidEmail({
          to: contributor.email,
          username: contributor.githubUsername,
          bountyAmount: amountFormatted,
          tokenSymbol,
          issueNumber: bounty.issueNumber,
          issueTitle: bounty.issueTitle || '',
          repoFullName: bounty.repoFullName,
          txUrl: txUrl || '',
          frontendUrl: FRONTEND_BASE
        });
      }
    ]
  ];

  for (const [name, step] of steps) {
    try {
      await step();
    } catch (error) {
      logger.warn(`Payout announcement step failed: ${name}`, { bountyId: bounty.bountyId, error: error.message });
    }
  }
}

/**
 * Announce a payout settled outside a webhook (wallet link, manual retry),
 * where no installation client is at hand. If the transfer went through but
 * recording it failed, alert maintainers on the PR as the webhook does.
 *
 * @param {object} params
 * @param {object} params.claim `{ id, repoFullName, prNumber, prAuthorGithubId }`
 * @param {object} params.bounty
 * @param {string} params.txHash
 * @param {string} params.username Contributor's GitHub login.
 * @param {Error} [params.recordError] From a settlement whose bookkeeping failed.
 */
export async function announceSettledClaim({ claim, bounty, txHash, username, recordError }) {
  let octokit = null;
  try {
    octokit = await getRepoOctokit(claim.repoFullName);
  } catch (error) {
    logger.warn('Payout announcement: no installation for repo', {
      repoFullName: claim.repoFullName,
      error: error.message
    });
  }

  await announcePayout({
    octokit,
    repoFullName: claim.repoFullName,
    prNumber: claim.prNumber,
    username,
    contributorGithubId: claim.prAuthorGithubId,
    bounty,
    txHash
  });

  if (!recordError) return;

  const ref = newErrorRef();
  logger.error(`[${ref}] Payout sent but not recorded`, {
    claimId: claim.id,
    bountyId: bounty.bountyId,
    txHash,
    error: recordError.stack || recordError.message
  });

  if (!octokit) return;

  try {
    const [owner, repo] = claim.repoFullName.split('/');
    await notifyMaintainers(octokit, owner, repo, claim.prNumber, {
      errorType: 'Payout Sent But Not Recorded',
      errorMessage: publicErrorMessage(ref),
      severity: 'critical',
      bountyId: bounty.bountyId,
      network: bounty.network,
      txHash,
      prNumber: claim.prNumber,
      username,
      context: `The transfer succeeded on-chain but updating the database failed. Mark bounty ${bounty.bountyId} resolved and claim ${claim.id} paid with this transaction hash. Do not retry the payout.`
    });
  } catch (error) {
    logger.error('Could not alert maintainers of unrecorded payout:', error.message);
  }
}

/**
 * Run `announceSettledClaim` once the response has been sent.
 *
 * `after()` throws when the platform offers no way to extend the request. The
 * payout has already happened by then, so that must not turn into an error
 * response: announce without waiting instead.
 *
 * @param {Parameters<typeof announceSettledClaim>[0]} params
 */
export function announceAfterResponse(params) {
  const run = () => announceSettledClaim(params);
  try {
    after(run);
  } catch (error) {
    logger.warn('after() unavailable; announcing payout without waiting:', error.message);
    run().catch((announceError) => logger.error('Payout announcement failed:', announceError.message));
  }
}
