import { postIssueComment, updateComment } from '../client.js';
import { renderPaymentSentComment, renderBountyResolvedComment } from '../templates/bounties';
import { BRAND_SIGNATURE, FRONTEND_BASE, OG_ICON } from '../constants.js';
import { formatAmountByToken, networkMeta } from './bountyFormatting.js';
import { userQueries } from '@/server/db/prisma.js';
import { sendBountyPaidEmail } from '@/integrations/email/email.js';

/**
 * Tells everyone a bounty was paid: a comment on the merged pull request, the
 * issue's pinned bounty summary flipped to resolved, and a note to the
 * contributor. Shared by the merge webhook (fresh payouts) and the payout
 * reconciler (payments recovered from chain after an interrupted attempt),
 * so a recovered payment is announced exactly like a fresh one.
 *
 * @param {object} params
 * @param {object} params.octokit - installation Octokit for the repository
 * @param {string} params.owner
 * @param {string} params.repo
 * @param {number} params.prNumber
 * @param {string} [params.username] - PR author login; looked up when absent
 * @param {object} params.bounty - normalized bounty row
 * @param {number} params.contributorGithubId
 * @param {string} params.txHash
 */
export async function announcePayment({
  octokit,
  owner,
  repo,
  prNumber,
  username,
  bounty,
  contributorGithubId,
  txHash
}) {
  const tokenSymbol = bounty.tokenSymbol || 'UNKNOWN';
  const amountFormatted = formatAmountByToken(bounty.amount, tokenSymbol);
  const explorerUrl = networkMeta(bounty.network).explorerTx(txHash);
  const contributor = await userQueries.findByGithubId(contributorGithubId);
  const login = username || contributor?.githubUsername || 'contributor';

  await postIssueComment(
    octokit,
    owner,
    repo,
    prNumber,
    renderPaymentSentComment({
      iconUrl: OG_ICON,
      username: login,
      amountFormatted,
      tokenSymbol,
      txUrl: explorerUrl,
      brandSignature: BRAND_SIGNATURE
    })
  );

  if (bounty.pinnedCommentId) {
    await updateComment(
      octokit,
      owner,
      repo,
      bounty.pinnedCommentId,
      renderBountyResolvedComment({
        iconUrl: OG_ICON,
        username: login,
        amountFormatted,
        tokenSymbol,
        txUrl: explorerUrl,
        brandSignature: BRAND_SIGNATURE
      })
    );
  }

  if (contributor?.email) {
    await sendBountyPaidEmail({
      to: contributor.email,
      username: contributor.githubUsername,
      bountyAmount: amountFormatted,
      tokenSymbol,
      issueNumber: bounty.issueNumber,
      issueTitle: bounty.issueTitle || '',
      repoFullName: bounty.repoFullName,
      txUrl: explorerUrl,
      frontendUrl: FRONTEND_BASE
    });
  }
}
