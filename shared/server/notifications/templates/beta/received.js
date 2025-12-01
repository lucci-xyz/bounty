/**
 * Email template for beta application received
 */
export function renderBetaReceivedEmail({ username, frontendUrl }) {
  const subject = 'BountyPay Beta Application Received';

  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          line-height: 1.6;
          color: #1f2937;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
          background-color: #f9fafb;
        }
        .container {
          background-color: #ffffff;
          border-radius: 8px;
          padding: 40px;
          box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
        }
        .header {
          text-align: center;
          margin-bottom: 30px;
        }
        h1 {
          color: #00827B;
          font-size: 24px;
          margin: 0 0 10px 0;
        }
        p {
          margin: 15px 0;
          font-size: 16px;
        }
        .status-badge {
          display: inline-block;
          background: linear-gradient(135deg, #3b82f6 0%, #60a5fa 100%);
          color: #ffffff;
          font-size: 14px;
          font-weight: 600;
          padding: 8px 20px;
          border-radius: 20px;
          margin: 15px 0;
        }
        .info-box {
          background-color: #f0f9ff;
          border-left: 4px solid #3b82f6;
          padding: 16px 20px;
          margin: 25px 0;
          border-radius: 0 8px 8px 0;
        }
        a {
          color: #00827B;
          text-decoration: none;
        }
        a:hover {
          text-decoration: underline;
        }
        .footer {
          text-align: center;
          margin-top: 40px;
          padding-top: 20px;
          border-top: 1px solid #e5e7eb;
          color: #6b7280;
          font-size: 14px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Thanks for Applying!</h1>
          <div class="status-badge">Application In Review</div>
        </div>

        <p>Hi <strong>${username}</strong>,</p>

        <p>Thank you for your interest in BountyPay! We've received your beta access application and it's now in our review queue.</p>

        <div class="info-box">
          <p style="margin: 0;"><strong>What happens next?</strong></p>
          <ul style="margin: 10px 0 0 0; padding-left: 20px;">
            <li>Our team reviews applications on a rolling basis</li>
            <li>We'll email you as soon as a decision is made</li>
            <li>Typical review time is 1-3 business days</li>
          </ul>
        </div>

        <p>While you wait, here's what BountyPay offers:</p>
        <ul>
          <li><strong>For Sponsors:</strong> Create bounties on GitHub issues to incentivize contributors</li>
          <li><strong>For Contributors:</strong> Earn crypto rewards by solving issues and submitting PRs</li>
          <li><strong>Automatic Payments:</strong> When a PR is merged and closes a bounty issue, payment is automatic</li>
        </ul>

        <p>We appreciate your patience and look forward to potentially welcoming you to the beta program!</p>

        <div class="footer">
          <p>BountyPay by Lucci Labs</p>
          <p><a href="${frontendUrl}">${frontendUrl}</a></p>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `
Thanks for Applying!

Hi ${username},

Thank you for your interest in BountyPay! We've received your beta access application and it's now in our review queue.

Status: Application In Review

What happens next?
- Our team reviews applications on a rolling basis
- We'll email you as soon as a decision is made
- Typical review time is 1-3 business days

While you wait, here's what BountyPay offers:
- For Sponsors: Create bounties on GitHub issues to incentivize contributors
- For Contributors: Earn crypto rewards by solving issues and submitting PRs
- Automatic Payments: When a PR is merged and closes a bounty issue, payment is automatic

We appreciate your patience and look forward to potentially welcoming you to the beta program!

---
BountyPay by Lucci Labs
${frontendUrl}
  `.trim();

  return { subject, html, text };
}

