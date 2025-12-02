import { logger } from '@/shared/lib/logger';
import { postIssueComment } from '../client.js';
import { sendErrorNotification } from '../../notifications/email.js';
import { ALERT_SEVERITY_STYLES, buildShieldsBadge } from '@/shared/lib';
import { renderSystemAlertComment, renderAlertEmailHtml } from '@/shared/server/github/templates/alerts';
import { BADGE_BASE, BADGE_LABEL_COLOR, BADGE_STYLE, BRAND_SIGNATURE, FRONTEND_BASE } from '../constants.js';
import { userQueries } from '../../db/prisma.js';

export async function notifyMaintainers(octokit, owner, repo, issueNumber, errorDetails) {
  const {
    errorType,
    errorMessage,
    severity = 'high',
    bountyId,
    network,
    recipientAddress,
    prNumber,
    username,
    githubId,
    txHash,
    context
  } = errorDetails;

  const timestamp = new Date().toISOString();
  const errorId = `ERR-${Date.now().toString(36).toUpperCase()}`;

  const severityStyle = ALERT_SEVERITY_STYLES[severity] || ALERT_SEVERITY_STYLES.high;
  const severityBadge = buildShieldsBadge({
    baseUrl: BADGE_BASE,
    label: 'Severity',
    value: severityStyle.label,
    color: severityStyle.badgeColor,
    labelColor: BADGE_LABEL_COLOR,
    style: BADGE_STYLE
  });
  const errorIdBadge = buildShieldsBadge({
    baseUrl: BADGE_BASE,
    label: 'Error ID',
    value: errorId,
    color: '6B7280',
    labelColor: BADGE_LABEL_COLOR,
    style: BADGE_STYLE
  });

  let detailsSection = '';
  if (bountyId) detailsSection += `\n- **Bounty ID:** \`${bountyId}\``;
  if (network) detailsSection += `\n- **Network:** ${network}`;
  if (recipientAddress) {
    detailsSection += `\n- **Recipient:** \`${recipientAddress.slice(0, 10)}...${recipientAddress.slice(-8)}\``;
  }
  if (prNumber) detailsSection += `\n- **PR:** #${prNumber}`;
  if (username) detailsSection += `\n- **User:** @${username}`;
  if (txHash) detailsSection += `\n- **Transaction:** \`${txHash}\``;

  const truncatedError = errorMessage.length > 300 ? `${errorMessage.substring(0, 300)}...` : errorMessage;

  const comment = renderSystemAlertComment({
    severityLabel: severityStyle.label,
    severityBadge,
    errorIdBadge,
    errorId,
    errorType,
    timestamp,
    truncatedError,
    detailsSection,
    context,
    troubleshootingUrl: `${FRONTEND_BASE}/docs/support/troubleshooting`,
    brandSignature: BRAND_SIGNATURE
  });

  // Send error notification to both user (if they have email) and ops team
  try {
    // Try to get user's email if we have their githubId or username
    let userEmail = null;
    const userGithubId = githubId || (username ? await getUserIdFromUsername(octokit, owner, repo, username) : null);
    
    if (userGithubId) {
      const user = await userQueries.findByGithubId(userGithubId);
      userEmail = user?.email;
    }

    await sendErrorNotification({
      to: userEmail,
      username,
      errorType,
      errorMessage: truncatedError,
      context,
      repoFullName: `${owner}/${repo}`,
      issueNumber,
      prNumber,
      bountyId,
      network,
      frontendUrl: FRONTEND_BASE
    });
  } catch (emailError) {
    logger.error('Failed to send error notification email:', emailError);
  }

  try {
    await postIssueComment(octokit, owner, repo, issueNumber, comment);
    logger.info(`Maintainer notification posted: ${errorId}`);
    return errorId;
  } catch (notifyError) {
    logger.error('Failed to notify maintainers:', notifyError.message);
    return null;
  }
}

/**
 * Helper to get GitHub user ID from username (if we don't already have it)
 * Returns null if unable to fetch
 */
async function getUserIdFromUsername(octokit, owner, repo, username) {
  try {
    // This is a best-effort attempt - we might not always have API access
    const { data } = await octokit.rest.users.getByUsername({ username });
    return data?.id;
  } catch {
    return null;
  }
}
