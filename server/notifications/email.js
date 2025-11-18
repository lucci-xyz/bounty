const ALERT_EMAIL = 'contact@luccilabs.xyz';
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const RESEND_FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'alerts@luccilabs.xyz';

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
    const response = await fetch('https://api.resend.com/emails', {
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

export function getAlertEmailAddress() {
  return ALERT_EMAIL;
}

