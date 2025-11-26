import { logger } from '@/shared/lib/logger';
import { getOctokit, postIssueComment, ensureLabel, addLabels, removeLabel, getIssueLabels } from '../../client.js';
import { bountyQueries } from '../../../db/prisma.js';
import { notifyMaintainers } from '../../services/maintainerAlerts.js';
import { formatAmountByToken, networkMeta } from '../../services/bountyFormatting.js';
import { renderBountyCreatedComment, renderBountyRefundedComment } from '../../templates/bounties';
import { OG_ICON, FRONTEND_BASE, BRAND_SIGNATURE } from '../../constants.js';
import { getLinkHref } from '@/shared/config/links';

export async function handleBountyCreated(bountyData) {
  const { repoFullName, issueNumber, bountyId, amount, deadline, sponsorAddress, txHash, installationId, network, tokenSymbol } = bountyData;

  if (!network) {
    throw new Error('Network alias is required for bounty creation');
  }
  if (!tokenSymbol) {
    throw new Error('Token symbol is required for bounty creation');
  }

  try {
    const octokit = await getOctokit(installationId);
    const [owner, repo] = repoFullName.split('/');

    const deadlineDate = new Date(deadline * 1000).toISOString().split('T')[0];
    const amountFormatted = formatAmountByToken(amount, tokenSymbol);
    const net = networkMeta(network);
    const issueUrl = getLinkHref('github', 'issue', { repoFullName, issueNumber });

    const comment = renderBountyCreatedComment({
      iconUrl: OG_ICON,
      amountFormatted,
      tokenSymbol,
      networkName: net.name,
      deadlineDate,
      txUrl: net.explorerTx(txHash),
      linkWalletUrl: `${FRONTEND_BASE}/link-wallet?returnTo=${encodeURIComponent(issueUrl)}`,
      brandSignature: BRAND_SIGNATURE
    });

    const postedComment = await postIssueComment(octokit, owner, repo, issueNumber, comment);

    const labelName = `bounty:$${Math.floor(parseFloat(amountFormatted))}`;
    try {
      await ensureLabel(octokit, owner, repo, labelName, '83EEE8', 'Active bounty amount');
      await addLabels(octokit, owner, repo, issueNumber, [labelName]);
    } catch (error) {
      // Non-critical
    }

    try {
      await bountyQueries.updatePinnedComment(bountyId, postedComment.id);
    } catch (dbError) {
      logger.error('Failed to update pinned comment ID:', dbError.message);

      await notifyMaintainers(octokit, owner, repo, issueNumber, {
        errorType: 'Database Sync Error',
        errorMessage: dbError.message,
        severity: 'medium',
        bountyId,
        network,
        txHash,
        context: `Bounty was created successfully on-chain and the comment was posted, but saving the comment ID (${postedComment.id}) to the database failed. This may affect future bounty updates.`
      });
    }

    return postedComment;
  } catch (error) {
    logger.error('Error in handleBountyCreated:', error.message);

    try {
      const octokit = await getOctokit(installationId);
      const [owner, repo] = repoFullName.split('/');

      await notifyMaintainers(octokit, owner, repo, issueNumber, {
        errorType: 'Bounty Notification Error',
        errorMessage: error.stack || error.message,
        severity: 'high',
        bountyId,
        network,
        txHash,
        context: `**Sponsor:** ${sponsorAddress}\n**Amount:** ${formatAmountByToken(amount, tokenSymbol)} ${tokenSymbol}\n\nThe bounty was created on-chain (tx: ${txHash}), but posting the notification comment failed. Users may not know about the bounty.`
      });
    } catch (notifyError) {
      logger.error('Could not notify maintainers:', notifyError.message);
    }

    throw error;
  }
}

/**
 * Posts a GitHub comment when a bounty is refunded.
 * Also removes any bounty-related labels from the issue.
 */
export async function handleBountyRefunded(bountyData) {
  const { repoFullName, issueNumber, bountyId, amount, txHash, installationId, network, tokenSymbol } = bountyData;

  if (!network) {
    throw new Error('Network alias is required for refund notification');
  }
  if (!tokenSymbol) {
    throw new Error('Token symbol is required for refund notification');
  }

  try {
    const octokit = await getOctokit(installationId);
    const [owner, repo] = repoFullName.split('/');

    const amountFormatted = formatAmountByToken(amount, tokenSymbol);
    const net = networkMeta(network);

    const comment = renderBountyRefundedComment({
      iconUrl: OG_ICON,
      amountFormatted,
      tokenSymbol,
      networkName: net.name,
      txUrl: net.explorerTx(txHash),
      brandSignature: BRAND_SIGNATURE
    });

    await postIssueComment(octokit, owner, repo, issueNumber, comment);

    // Remove bounty labels from the issue
    try {
      const labels = await getIssueLabels(octokit, owner, repo, issueNumber);
      const bountyLabels = labels.filter(l => l.name.startsWith('bounty:'));
      for (const label of bountyLabels) {
        await removeLabel(octokit, owner, repo, issueNumber, label.name);
      }
    } catch (labelError) {
      // Non-critical - log but don't fail
      logger.warn('Could not remove bounty labels:', labelError.message);
    }

    logger.info(`Posted refund notification for bounty ${bountyId} on ${repoFullName}#${issueNumber}`);
  } catch (error) {
    logger.error('Error in handleBountyRefunded:', error.message);

    try {
      const octokit = await getOctokit(installationId);
      const [owner, repo] = repoFullName.split('/');

      await notifyMaintainers(octokit, owner, repo, issueNumber, {
        errorType: 'Refund Notification Error',
        errorMessage: error.stack || error.message,
        severity: 'medium',
        bountyId,
        network,
        txHash,
        context: `The bounty was refunded on-chain (tx: ${txHash}), but posting the notification comment failed.`
      });
    } catch (notifyError) {
      logger.error('Could not notify maintainers of refund error:', notifyError.message);
    }

    // Don't throw - refund succeeded, just notification failed
  }
}
