import { postIssueComment } from '../client.js';
import { sendSystemEmail } from '../../notifications/email.js';
import { ALERT_SEVERITY_STYLES, buildShieldsBadge } from '@/shared/lib';
import { renderMaintainerAlertComment, renderMaintainerAlertEmail } from '@/shared/server/github/templates/alerts';
import { BADGE_BASE, BADGE_LABEL_COLOR, BADGE_STYLE, BRAND_SIGNATURE, FRONTEND_BASE } from '../constants.js';

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

  const comment = renderMaintainerAlertComment({
    emoji: severityStyle.emoji,
    severityBadge,
    errorIdBadge,
    errorType,
    timestamp,
    truncatedError,
    detailsSection,
    context,
    troubleshootingUrl: `${FRONTEND_BASE}/docs/support/troubleshooting`,
    errorId,
    brandSignature: BRAND_SIGNATURE
  });

  const emailSubject = `[BountyPay Alert] ${severityStyle.label} - ${errorType}`;
  const detailsHtml = detailsSection
    ? `<p><strong>Details:</strong><br/>${detailsSection.replace(/\n/g, '<br/>')}</p>`
    : '';
  const contextHtml = context ? `<p><strong>Additional Context:</strong><br/>${context.replace(/\n/g, '<br/>')}</p>` : '';
  const emailHtml = renderMaintainerAlertEmail({
    emoji: severityStyle.emoji,
    errorType,
    owner,
    repo,
    issueNumber,
    severityLabel: severityStyle.label,
    errorId,
    timestamp,
    truncatedError,
    detailsHtml,
    contextHtml
  });

  try {
    await sendSystemEmail({
      subject: emailSubject,
      html: emailHtml
    });
  } catch (emailError) {
    console.error('Failed to send alert email:', emailError);
  }

  try {
    await postIssueComment(octokit, owner, repo, issueNumber, comment);
    console.log(`Maintainer notification posted: ${errorId}`);
    return errorId;
  } catch (notifyError) {
    console.error('Failed to notify maintainers:', notifyError.message);
    return null;
  }
}

