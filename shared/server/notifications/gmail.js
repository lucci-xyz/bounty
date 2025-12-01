/**
 * Gmail API client for sending transactional emails
 * Uses service account with domain-wide delegation
 * 
 * REQUIRED SETUP:
 * 1. Service account with domain-wide delegation enabled
 * 2. Gmail API scope authorized in Google Workspace Admin
 * 3. GMAIL_DELEGATED_USER must be a real Workspace user (e.g., natalie@luccilabs.xyz)
 * 4. That user must have "Send As" permission for all sender aliases
 */

import { google } from 'googleapis';
import { logger } from '@/shared/lib/logger';

// Email sender addresses (these are "Send As" aliases, not real accounts)
export const EMAIL_SENDERS = {
  noReply: 'no-reply@luccilabs.xyz',
  beta: 'beta@luccilabs.xyz',
  ops: 'ops@luccilabs.xyz'
};

// The real Workspace user to impersonate (must have Send As permission for all senders)
const DELEGATED_USER = process.env.GMAIL_DELEGATED_USER;

// Gmail API scope required for sending emails
const GMAIL_SCOPES = ['https://www.googleapis.com/auth/gmail.send'];

/**
 * Parse and normalize service account credentials from environment
 * Handles escaped newlines in private key
 */
function getServiceAccountCredentials() {
  const credentialsJson = process.env.GMAIL_SERVICE_ACCOUNT_JSON;
  
  if (!credentialsJson) {
    return null;
  }
  
  try {
    const credentials = JSON.parse(credentialsJson);
    
    // Fix private key newlines - env vars often have escaped \n as \\n
    if (credentials.private_key) {
      credentials.private_key = credentials.private_key.replace(/\\n/g, '\n');
    }
    
    return credentials;
  } catch (error) {
    logger.error('[gmail] Failed to parse GMAIL_SERVICE_ACCOUNT_JSON:', error.message);
    return null;
  }
}

/**
 * Create a Gmail API client authenticated with the service account
 * Uses domain-wide delegation to impersonate a real Workspace user
 */
async function getGmailClient() {
  const credentials = getServiceAccountCredentials();
  
  if (!credentials) {
    throw new Error('Gmail service account not configured (GMAIL_SERVICE_ACCOUNT_JSON missing)');
  }
  
  if (!DELEGATED_USER) {
    throw new Error('Gmail delegated user not configured (GMAIL_DELEGATED_USER missing). Must be a real Workspace user like natalie@luccilabs.xyz');
  }
  
  if (!credentials.client_email) {
    throw new Error('Service account JSON missing client_email field');
  }
  
  if (!credentials.private_key) {
    throw new Error('Service account JSON missing private_key field');
  }
  
  // Create JWT client with domain-wide delegation
  // The 'subject' is the Workspace user we're impersonating
  const jwtClient = new google.auth.JWT({
    email: credentials.client_email,
    key: credentials.private_key,
    scopes: GMAIL_SCOPES,
    subject: DELEGATED_USER  // This MUST be a real Workspace user, not an alias
  });
  
  // Authorize the client
  await jwtClient.authorize();
  
  // Return Gmail API client
  return google.gmail({ version: 'v1', auth: jwtClient });
}

/**
 * Create a base64url-encoded email message (RFC 2822 format)
 */
function createEmailMessage({ from, to, subject, html, text }) {
  const boundary = `boundary_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  
  // Build MIME message
  const messageParts = [
    `From: ${from}`,
    `To: ${to}`,
    `Subject: ${subject}`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    '',
    `--${boundary}`,
    'Content-Type: text/plain; charset="UTF-8"',
    'Content-Transfer-Encoding: 7bit',
    '',
    text || stripHtml(html),
    '',
    `--${boundary}`,
    'Content-Type: text/html; charset="UTF-8"',
    'Content-Transfer-Encoding: 7bit',
    '',
    html,
    '',
    `--${boundary}--`
  ];
  
  const message = messageParts.join('\r\n');
  
  // Base64url encode (RFC 4648 §5)
  return Buffer.from(message, 'utf-8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * Strip HTML tags for plain text fallback
 */
function stripHtml(html) {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .trim();
}

/**
 * Send an email via Gmail API
 * @param {Object} params
 * @param {string} params.from - Sender email address (must be a "Send As" alias for GMAIL_DELEGATED_USER)
 * @param {string} params.to - Recipient email address
 * @param {string} params.subject - Email subject
 * @param {string} params.html - HTML body
 * @param {string} [params.text] - Plain text body (optional, derived from HTML if not provided)
 */
export async function sendEmail({ from, to, subject, html, text }) {
  // Validate configuration
  if (!process.env.GMAIL_SERVICE_ACCOUNT_JSON) {
    logger.warn(`[gmail] GMAIL_SERVICE_ACCOUNT_JSON not configured. Skipping email: ${subject}`);
    return { skipped: true, reason: 'no_credentials' };
  }
  
  if (!DELEGATED_USER) {
    logger.warn(`[gmail] GMAIL_DELEGATED_USER not configured. Skipping email: ${subject}`);
    return { skipped: true, reason: 'no_delegated_user' };
  }
  
  if (!to) {
    logger.warn(`[gmail] No recipient provided for email: ${subject}`);
    return { skipped: true, reason: 'no_recipient' };
  }
  
  try {
    const gmail = await getGmailClient();
    
    const raw = createEmailMessage({
      from,
      to,
      subject,
      html,
      text
    });
    
    // Send email using the impersonated user's mailbox
    // userId: 'me' refers to the impersonated user (GMAIL_DELEGATED_USER)
    const response = await gmail.users.messages.send({
      userId: 'me',
      requestBody: { raw }
    });
    
    logger.info(`[gmail] Email sent successfully from=${from} to=${to} messageId=${response.data.id}`);
    return { success: true, messageId: response.data.id };
  } catch (error) {
    // Log detailed error for debugging
    const errorDetails = error.response?.data?.error || error.message;
    logger.error(`[gmail] Failed to send email to ${to}:`, errorDetails);
    
    // Return user-friendly error
    return { 
      success: false, 
      error: typeof errorDetails === 'object' ? JSON.stringify(errorDetails) : errorDetails 
    };
  }
}

/**
 * Send a transactional email from no-reply@luccilabs.xyz
 */
export async function sendTransactionalEmail({ to, subject, html, text }) {
  return sendEmail({
    from: EMAIL_SENDERS.noReply,
    to,
    subject,
    html,
    text
  });
}

/**
 * Send a beta program email from beta@luccilabs.xyz
 */
export async function sendBetaEmail({ to, subject, html, text }) {
  return sendEmail({
    from: EMAIL_SENDERS.beta,
    to,
    subject,
    html,
    text
  });
}

/**
 * Send an ops alert email to ops@luccilabs.xyz
 */
export async function sendOpsAlert({ subject, html, text }) {
  return sendEmail({
    from: EMAIL_SENDERS.noReply,
    to: EMAIL_SENDERS.ops,
    subject,
    html,
    text
  });
}

/**
 * Check if Gmail service is fully configured
 */
export function isGmailConfigured() {
  return !!(getServiceAccountCredentials() && DELEGATED_USER);
}
