/**
 * Email template for when a bounty expires without being closed
 */
export function renderBountyExpiredEmail({
  username,
  bountyAmount,
  tokenSymbol,
  issueNumber,
  issueTitle,
  repoFullName,
  frontendUrl
}) {
  const issueUrl = `https://github.com/${repoFullName}/issues/${issueNumber}`;
  
  const subject = `Your ${bountyAmount} ${tokenSymbol} bounty has expired`;

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
          color: #b45309;
          font-size: 24px;
          margin: 0 0 10px 0;
        }
        .bounty-amount {
          background: linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%);
          color: #ffffff;
          font-size: 28px;
          font-weight: 700;
          padding: 20px;
          border-radius: 8px;
          text-align: center;
          margin: 20px 0;
        }
        p {
          margin: 15px 0;
          font-size: 16px;
        }
        .info-box {
          background-color: #fffbeb;
          border-left: 4px solid #f59e0b;
          padding: 16px 20px;
          margin: 20px 0;
          border-radius: 0 8px 8px 0;
        }
        .cta-button {
          display: inline-block;
          background-color: #00827B;
          color: #ffffff;
          padding: 14px 32px;
          text-decoration: none;
          border-radius: 6px;
          font-weight: 600;
          margin: 20px 0;
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
          <h1>⏰ Bounty Expired</h1>
        </div>

        <p>Hi <strong>${username}</strong>,</p>

        <p>Your bounty on issue <a href="${issueUrl}">#${issueNumber}</a> has reached its deadline and expired.</p>

        <div class="bounty-amount">
          ${bountyAmount} ${tokenSymbol}
        </div>

        <div class="info-box">
          <p style="margin: 0 0 10px 0;"><strong>Repository:</strong> ${repoFullName}</p>
          <p style="margin: 0 0 10px 0;"><strong>Issue:</strong> <a href="${issueUrl}">#${issueNumber}${issueTitle ? ` - ${issueTitle}` : ''}</a></p>
          <p style="margin: 0;"><strong>Status:</strong> Eligible for refund</p>
        </div>

        <p><strong>What are your options?</strong></p>
        <ul>
          <li><strong>Request a refund:</strong> You can claim your funds back from your dashboard</li>
          <li><strong>Create a new bounty:</strong> If you still need the issue solved, you can create a new bounty with an extended deadline</li>
        </ul>

        <div style="text-align: center;">
          <a href="${frontendUrl}/account" class="cta-button">Manage Your Bounties</a>
        </div>

        <p style="color: #6b7280; font-size: 14px;">The issue remains open on GitHub. The bounty expiration only affects the reward, not the issue itself.</p>

        <div class="footer">
          <p>BountyPay by Lucci Labs</p>
          <p><a href="${frontendUrl}">${frontendUrl}</a></p>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `
Bounty Expired

Hi ${username},

Your bounty on issue #${issueNumber} has reached its deadline and expired.

Bounty Amount: ${bountyAmount} ${tokenSymbol}

Repository: ${repoFullName}
Issue: #${issueNumber}${issueTitle ? ` - ${issueTitle}` : ''}
${issueUrl}

Status: Eligible for refund

What are your options?
- Request a refund: You can claim your funds back from your dashboard
- Create a new bounty: If you still need the issue solved, you can create a new bounty with an extended deadline

Manage your bounties: ${frontendUrl}/account

The issue remains open on GitHub. The bounty expiration only affects the reward, not the issue itself.

---
BountyPay by Lucci Labs
${frontendUrl}
  `.trim();

  return { subject, html, text };
}

