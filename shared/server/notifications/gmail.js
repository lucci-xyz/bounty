/**
 * Gmail API client for sending transactional emails
 * Uses service account with domain-wide delegation
 */

import { google } from 'googleapis';
import { logger } from '@/shared/lib/logger';

// Email sender addresses
export const EMAIL_SENDERS = {
  noReply: 'no-reply@luccilabs.xyz',
  beta: 'beta@luccilabs.xyz',
  ops: 'ops@luccilabs.xyz'
};

// Service account configuration from environment
const getServiceAccountCredentials = () => {
  const credentials = process.env.GMAIL_SERVICE_ACCOUNT_JSON;
  if (!credentials) {
    return null;
  }
  
  try {
    return JSON.parse(credentials);
  } catch (error) {
    logger.error('[gmail] Failed to parse GMAIL_SERVICE_ACCOUNT_JSON:', error.message);
    return null;
  }
};

/**
 * Create a Gmail API client authenticated with the service account
 * @param {string} impersonateEmail - The email address to impersonate (sender)
 */
async function getGmailClient(impersonateEmail) {
  const credentials = getServiceAccountCredentials();
  
  if (!credentials) {
    throw new Error('Gmail service account not configured');
  }
  
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/gmail.send'],
    clientOptions: {
      subject: impersonateEmail
    }
  });
  
  // For service accounts with domain-wide delegation, we need to use JWT
  const client = new google.auth.JWT({
    email: credentials.client_email,
    key: credentials.private_key,
    scopes: ['https://www.googleapis.com/auth/gmail.send'],
    subject: impersonateEmail
  });
  
  await client.authorize();
  
  return google.gmail({ version: 'v1', auth: client });
}

/**
 * Create a base64-encoded email message
 */
function createEmailMessage({ from, to, subject, html, text }) {
  const boundary = `boundary_${Date.now()}`;
  
  const messageParts = [
    `From: ${from}`,
    `To: ${to}`,
    `Subject: ${subject}`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    '',
    `--${boundary}`,
    'Content-Type: text/plain; charset="UTF-8"',
    'Content-Transfer-Encoding: quoted-printable',
    '',
    text || html.replace(/<[^>]+>/g, ''),
    '',
    `--${boundary}`,
    'Content-Type: text/html; charset="UTF-8"',
    'Content-Transfer-Encoding: quoted-printable',
    '',
    html,
    '',
    `--${boundary}--`
  ];
  
  const message = messageParts.join('\r\n');
  
  // Base64url encode the message
  return Buffer.from(message)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * Send an email via Gmail API
 * @param {Object} params
 * @param {string} params.from - Sender email address
 * @param {string} params.to - Recipient email address
 * @param {string} params.subject - Email subject
 * @param {string} params.html - HTML body
 * @param {string} [params.text] - Plain text body (optional, derived from HTML if not provided)
 */
export async function sendEmail({ from, to, subject, html, text }) {
  const credentials = getServiceAccountCredentials();
  
  if (!credentials) {
    logger.warn(`[gmail] Service account not configured. Skipping email: ${subject}`);
    return { skipped: true, reason: 'no_credentials' };
  }
  
  if (!to) {
    logger.warn(`[gmail] No recipient provided for email: ${subject}`);
    return { skipped: true, reason: 'no_recipient' };
  }
  
  try {
    const gmail = await getGmailClient(from);
    
    const raw = createEmailMessage({
      from,
      to,
      subject,
      html,
      text
    });
    
    const response = await gmail.users.messages.send({
      userId: 'me',
      requestBody: {
        raw
      }
    });
    
    logger.info(`[gmail] Email sent successfully to ${to}, messageId: ${response.data.id}`);
    return { success: true, messageId: response.data.id };
  } catch (error) {
    logger.error(`[gmail] Failed to send email to ${to}:`, error.message);
    return { success: false, error: error.message };
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
 * Check if Gmail service is configured
 */
export function isGmailConfigured() {
  return !!getServiceAccountCredentials();
}

