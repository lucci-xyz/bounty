import { logger } from '@/lib/logger';
import { getRepoOctokit, postIssueComment, updateComment } from '../client.js';
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
 * where no installation client is at hand.
 *
 * @param {object} params
 * @param {object} params.claim `{ repoFullName, prNumber, prAuthorGithubId }`
 * @param {object} params.bounty
 * @param {string} params.txHash
 * @param {string} params.username Contributor's GitHub login.
 */
export async function announceSettledClaim({ claim, bounty, txHash, username }) {
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
}
