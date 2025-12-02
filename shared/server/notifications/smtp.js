/**
 * SMTP email client using nodemailer
 * Sends emails via Gmail SMTP (smtp.gmail.com:465)
 * 
 * REQUIRED SETUP:
 * 1. SMTP_USER - Gmail account email (e.g., natalie@luccilabs.xyz)
 * 2. SMTP_PASS - Gmail app password (16-character password)
 */

import nodemailer from 'nodemailer';
import { logger } from '@/shared/lib/logger';

// Email sender addresses
export const EMAIL_SENDERS = {
  noReply: 'no-reply@luccilabs.xyz',
  beta: 'beta@luccilabs.xyz',
  ops: 'ops@luccilabs.xyz'
};

// SMTP configuration from environment
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;

/**
 * Create a nodemailer transporter for Gmail SMTP
 * Uses connection pooling for better performance
 */
let transporter = null;

function getTransporter() {
  if (transporter) {
    return transporter;
  }

  if (!SMTP_USER || !SMTP_PASS) {
    return null;
  }

  transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true, // true for 465, false for other ports
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS
    }
  });

  return transporter;
}

/**
 * Send an email via SMTP
 * @param {Object} params
 * @param {string} params.from - Sender email address
 * @param {string} params.to - Recipient email address
 * @param {string} params.subject - Email subject
 * @param {string} params.html - HTML body
 * @param {string} [params.text] - Plain text body (optional, derived from HTML if not provided)
 * @param {string} [params.replyTo] - Reply-to address (optional)
 * @returns {Promise<{success: boolean, messageId?: string, skipped?: boolean, reason?: string, error?: string}>}
 */
export async function sendEmail({ from, to, subject, html, text, replyTo }) {
  // Validate configuration
  if (!SMTP_USER || !SMTP_PASS) {
    logger.warn(`[smtp] SMTP credentials not configured. Skipping email: ${subject}`);
    return { skipped: true, reason: 'no_credentials' };
  }

  if (!to) {
    logger.warn(`[smtp] No recipient provided for email: ${subject}`);
    return { skipped: true, reason: 'no_recipient' };
  }

  if (!from) {
    logger.warn(`[smtp] No sender provided for email: ${subject}`);
    return { skipped: true, reason: 'no_sender' };
  }

  try {
    const mailTransporter = getTransporter();
    
    if (!mailTransporter) {
      logger.warn(`[smtp] Transporter not available. Skipping email: ${subject}`);
      return { skipped: true, reason: 'no_transporter' };
    }

    const mailOptions = {
      from,
      to,
      subject,
      html,
      text: text || stripHtml(html),
      ...(replyTo && { replyTo })
    };

    const info = await mailTransporter.sendMail(mailOptions);

    logger.info(`[smtp] Email sent successfully from=${from} to=${to} messageId=${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    logger.error(`[smtp] Failed to send email to ${to}:`, error.message);
    
    return {
      success: false,
      error: error.message
    };
  }
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
 * Check if SMTP service is fully configured
 */
export function isSmtpConfigured() {
  return !!(SMTP_USER && SMTP_PASS);
}

