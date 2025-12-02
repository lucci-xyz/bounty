import { logger } from '@/shared/lib/logger';
import {
  sendTransactionalEmail,
  sendBetaEmail,
  sendOpsAlert,
  isSmtpConfigured,
  EMAIL_SENDERS
} from './smtp.js';
import {
  renderPrOpenedEmail,
  renderBountyExpiredEmail,
  renderUserErrorEmail,
  renderOpsErrorEmail,
  renderBetaApprovedEmail,
  renderBetaRejectedEmail,
  renderBetaReceivedEmail
} from './templates/index.js';

// Re-export email senders for external use
export { EMAIL_SENDERS };

/**
 * Get the ops alert email address
 */
export function getOpsEmailAddress() {
  return EMAIL_SENDERS.ops;
}

/**
 * Get the alert email address (legacy, now points to ops)
 */
export function getAlertEmailAddress() {
  return EMAIL_SENDERS.ops;
}

// ============================================================================
// TRANSACTIONAL EMAILS (from no-reply@luccilabs.xyz)
// ============================================================================

/**
 * Send PR opened notification to a contributor
 * @param {Object} params
 * @param {string} params.to - Recipient email address
 * @param {string} params.username - GitHub username
 * @param {number} params.prNumber - PR number
 * @param {string} params.prTitle - PR title
 * @param {string} params.repoFullName - Full repo name (owner/repo)
 * @param {string} params.bountyAmount - Formatted bounty amount
 * @param {string} params.tokenSymbol - Token symbol (USDC, MUSD)
 * @param {number} params.issueNumber - Issue number
 * @param {string} params.frontendUrl - Frontend URL
 */
export async function sendPrOpenedEmail(params) {
  const { to, ...templateParams } = params;
  
  if (!isSmtpConfigured()) {
    logger.warn('[email] SMTP not configured. Skipping PR opened email');
    return { skipped: true, reason: 'no_config' };
  }
  
  const template = renderPrOpenedEmail(templateParams);
  return sendTransactionalEmail({
    to,
    subject: template.subject,
    html: template.html,
    text: template.text
  });
}

/**
 * Send bounty expired notification to a sponsor
 * @param {Object} params
 * @param {string} params.to - Recipient email address
 * @param {string} params.username - GitHub username
 * @param {string} params.bountyAmount - Formatted bounty amount
 * @param {string} params.tokenSymbol - Token symbol
 * @param {number} params.issueNumber - Issue number
 * @param {string} params.issueTitle - Issue title
 * @param {string} params.repoFullName - Full repo name
 * @param {string} params.frontendUrl - Frontend URL
 */
export async function sendBountyExpiredEmail(params) {
  const { to, ...templateParams } = params;
  
  if (!isSmtpConfigured()) {
    logger.warn('[email] SMTP not configured. Skipping bounty expired email');
    return { skipped: true, reason: 'no_config' };
  }
  
  const template = renderBountyExpiredEmail(templateParams);
  return sendTransactionalEmail({
    to,
    subject: template.subject,
    html: template.html,
    text: template.text
  });
}

/**
 * Send error notification to a user AND ops team
 * @param {Object} params
 * @param {string} params.to - User's email address (optional)
 * @param {string} params.username - GitHub username
 * @param {string} params.errorType - Type of error
 * @param {string} params.errorMessage - Error message
 * @param {string} params.context - Additional context
 * @param {string} params.repoFullName - Repository name
 * @param {number} params.issueNumber - Issue number
 * @param {number} params.prNumber - PR number
 * @param {string} params.bountyId - Bounty ID
 * @param {string} params.network - Network alias
 * @param {string} params.frontendUrl - Frontend URL
 */
export async function sendErrorNotification(params) {
  const { to, frontendUrl, ...errorParams } = params;
  const results = { user: null, ops: null };
  
  if (!isSmtpConfigured()) {
    logger.warn('[email] SMTP not configured. Skipping error notification');
    return { skipped: true, reason: 'no_config' };
  }
  
  // Always send to ops team
  const opsTemplate = renderOpsErrorEmail({
    ...errorParams,
    userEmail: to,
    timestamp: new Date().toISOString()
  });
  
  results.ops = await sendOpsAlert({
    subject: opsTemplate.subject,
    html: opsTemplate.html,
    text: opsTemplate.text
  });
  
  // Send to user if they have an email
  if (to) {
    const userTemplate = renderUserErrorEmail({
      ...errorParams,
      frontendUrl
    });
    
    results.user = await sendTransactionalEmail({
      to,
      subject: userTemplate.subject,
      html: userTemplate.html,
      text: userTemplate.text
    });
  }
  
  return results;
}

// ============================================================================
// BETA PROGRAM EMAILS (from beta@luccilabs.xyz)
// ============================================================================

/**
 * Send beta application received email
 * @param {Object} params
 * @param {string} params.to - Recipient email address
 * @param {string} params.username - GitHub username
 * @param {string} params.frontendUrl - Frontend URL
 */
export async function sendBetaReceivedEmail(params) {
  const { to, ...templateParams } = params;
  
  if (!isSmtpConfigured()) {
    logger.warn('[email] SMTP not configured. Skipping beta received email');
    return { skipped: true, reason: 'no_config' };
  }
  
  const template = renderBetaReceivedEmail(templateParams);
  return sendBetaEmail({
    to,
    subject: template.subject,
    html: template.html,
    text: template.text
  });
}

/**
 * Send beta application approved email
 * @param {Object} params
 * @param {string} params.to - Recipient email address
 * @param {string} params.username - GitHub username
 * @param {string} params.frontendUrl - Frontend URL
 */
export async function sendBetaApprovedEmail(params) {
  const { to, ...templateParams } = params;
  
  if (!isSmtpConfigured()) {
    logger.warn('[email] SMTP not configured. Skipping beta approved email');
    return { skipped: true, reason: 'no_config' };
  }
  
  const template = renderBetaApprovedEmail(templateParams);
  return sendBetaEmail({
    to,
    subject: template.subject,
    html: template.html,
    text: template.text
  });
}

/**
 * Send beta application rejected email
 * @param {Object} params
 * @param {string} params.to - Recipient email address
 * @param {string} params.username - GitHub username
 * @param {string} params.frontendUrl - Frontend URL
 */
export async function sendBetaRejectedEmail(params) {
  const { to, ...templateParams } = params;
  
  if (!isSmtpConfigured()) {
    logger.warn('[email] SMTP not configured. Skipping beta rejected email');
    return { skipped: true, reason: 'no_config' };
  }
  
  const template = renderBetaRejectedEmail(templateParams);
  return sendBetaEmail({
    to,
    subject: template.subject,
    html: template.html,
    text: template.text
  });
}

// ============================================================================
// LEGACY FUNCTIONS (for backwards compatibility)
// ============================================================================

/**
 * Send a system alert email (now sends to ops)
 * @deprecated Use sendErrorNotification instead
 */
export async function sendSystemEmail({ subject, html, text }) {
  if (!isSmtpConfigured()) {
    logger.warn(`[email] SMTP not configured. Skipping system email: ${subject}`);
    return { skipped: true };
  }
  
  return sendOpsAlert({ subject, html, text });
}

/**
 * Send an email to a specific user
 * @deprecated Use specific email functions instead
 */
export async function sendUserEmail({ to, subject, html, text }) {
  if (!isSmtpConfigured()) {
    logger.warn(`[email] SMTP not configured. Skipping user email: ${subject}`);
    return { skipped: true };
  }

  if (!to) {
    logger.warn(`[email] No recipient provided for email: ${subject}`);
    return { skipped: true, reason: 'no_recipient' };
  }

  return sendTransactionalEmail({ to, subject, html, text });
}
