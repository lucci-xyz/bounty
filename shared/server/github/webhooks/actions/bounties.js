import { logger } from '@/shared/lib/logger';
import { getOctokit, postIssueComment, ensureLabel, addLabels } from '../../client.js';
import { bountyQueries } from '../../../db/prisma.js';
import { notifyMaintainers } from '../../services/maintainerAlerts.js';
import { formatAmountByToken, networkMeta } from '../../services/bountyFormatting.js';
import { renderBountySummaryComment } from '../../templates/bounties';
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

    const truncatedTx = txHash ? `${txHash.slice(0, 10)}...` : 'transaction';
    const summary = renderBountySummaryComment({
      iconUrl: OG_ICON,
      amountFormatted,
      tokenSymbol,
      networkName: net.name,
      deadlineDate,
      txUrl: net.explorerTx(txHash),
      txDisplay: truncatedTx,
      issueNumber,
      linkWalletUrl: `${FRONTEND_BASE}/link-wallet?returnTo=${encodeURIComponent(issueUrl)}`,
      brandSignature: BRAND_SIGNATURE
    });

    const comment = await postIssueComment(octokit, owner, repo, issueNumber, summary);

    const labelName = `bounty:$${Math.floor(parseFloat(amountFormatted))}`;
    try {
      await ensureLabel(octokit, owner, repo, labelName, '83EEE8', 'Active bounty amount');
      await addLabels(octokit, owner, repo, issueNumber, [labelName]);
    } catch (error) {
      // Non-critical
    }

    try {
      await bountyQueries.updatePinnedComment(bountyId, comment.id);
    } catch (dbError) {
      logger.error('Failed to update pinned comment ID:', dbError.message);

      await notifyMaintainers(octokit, owner, repo, issueNumber, {
        errorType: 'Database Sync Error',
        errorMessage: dbError.message,
        severity: 'medium',
        bountyId,
        network,
        txHash,
        context: `Bounty was created successfully on-chain and the comment was posted, but saving the comment ID (${comment.id}) to the database failed. This may affect future bounty updates.`
      });
    }

    return comment;
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

