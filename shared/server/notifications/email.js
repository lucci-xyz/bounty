import { getLinkHref } from '@/shared/config/links';

const ALERT_EMAIL = 'contact@luccilabs.xyz';
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const RESEND_FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'alerts@luccilabs.xyz';
const RESEND_EMAIL_ENDPOINT = getLinkHref('services', 'resendEmail');

/**
 * Send a system alert email via Resend.
 * Gracefully no-ops if credentials are missing to avoid throwing inside critical paths.
 * @param {Object} params
 * @param {string} params.subject
 * @param {string} params.html
 * @param {string} [params.text]
 */
export async function sendSystemEmail({ subject, html, text }) {
  if (!RESEND_API_KEY) {
    console.warn(`[email] RESEND_API_KEY not configured. Skipping alert email: ${subject}`);
    return { skipped: true };
  }

  try {
    const response = await fetch(RESEND_EMAIL_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${RESEND_API_KEY}`
      },
      body: JSON.stringify({
        from: RESEND_FROM_EMAIL,
        to: [ALERT_EMAIL],
        subject,
        html,
        text: text || html.replace(/<[^>]+>/g, '')
      })
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error('[email] Failed to send alert email:', response.status, errorBody);
      return { success: false };
    }

    return { success: true };
  } catch (error) {
    console.error('[email] Exception while sending alert email:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Send an email to a specific user via Resend.
 * Gracefully no-ops if credentials are missing to avoid throwing inside critical paths.
 * @param {Object} params
 * @param {string} params.to - Recipient email address
 * @param {string} params.subject
 * @param {string} params.html
 * @param {string} [params.text]
 */
export async function sendUserEmail({ to, subject, html, text }) {
  if (!RESEND_API_KEY) {
    console.warn(`[email] RESEND_API_KEY not configured. Skipping user email: ${subject}`);
    return { skipped: true };
  }

  if (!to) {
    console.warn(`[email] No recipient provided for email: ${subject}`);
    return { skipped: true, reason: 'no_recipient' };
  }

  try {
    const response = await fetch(RESEND_EMAIL_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${RESEND_API_KEY}`
      },
      body: JSON.stringify({
        from: RESEND_FROM_EMAIL,
        to: [to],
        subject,
        html,
        text: text || html.replace(/<[^>]+>/g, '')
      })
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error('[email] Failed to send user email:', response.status, errorBody);
      return { success: false };
    }

    const result = await response.json();
    console.log(`[email] User email sent successfully to ${to}`);
    return { success: true, id: result.id };
  } catch (error) {
    console.error('[email] Exception while sending user email:', error);
    return { success: false, error: error.message };
  }
}

export function getAlertEmailAddress() {
  return ALERT_EMAIL;
}

