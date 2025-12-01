/**
 * Email template for when a user opens a PR for a bounty
 */
export function renderPrOpenedEmail({
  username,
  prNumber,
  prTitle,
  repoFullName,
  bountyAmount,
  tokenSymbol,
  issueNumber,
  frontendUrl
}) {
  const prUrl = `https://github.com/${repoFullName}/pull/${prNumber}`;
  const issueUrl = `https://github.com/${repoFullName}/issues/${issueNumber}`;
  
  const subject = `Your PR #${prNumber} is linked to a ${bountyAmount} ${tokenSymbol} bounty`;

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
        .bounty-amount {
          background: linear-gradient(135deg, #00827B 0%, #39BEB7 100%);
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
          background-color: #f0fdf4;
          border-left: 4px solid #00827B;
          padding: 16px 20px;
          margin: 20px 0;
          border-radius: 0 8px 8px 0;
        }
        .info-box strong {
          color: #00827B;
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
          <h1>🎯 PR Linked to Bounty!</h1>
        </div>

        <p>Hi <strong>${username}</strong>,</p>

        <p>Great news! Your pull request has been linked to a bounty on BountyPay.</p>

        <div class="bounty-amount">
          ${bountyAmount} ${tokenSymbol}
        </div>

        <div class="info-box">
          <p style="margin: 0 0 10px 0;"><strong>Pull Request:</strong> <a href="${prUrl}">#${prNumber} - ${prTitle || 'View PR'}</a></p>
          <p style="margin: 0;"><strong>Linked Issue:</strong> <a href="${issueUrl}">#${issueNumber}</a></p>
        </div>

        <p><strong>What happens next?</strong></p>
        <ul>
          <li>When your PR is merged and closes issue #${issueNumber}, you'll automatically receive the bounty</li>
          <li>Make sure your wallet is linked to your GitHub account to receive payment</li>
          <li>The bounty will be sent to your linked wallet address</li>
        </ul>

        <div style="text-align: center;">
          <a href="${frontendUrl}/account" class="cta-button">Check Your Dashboard</a>
        </div>

        <div class="footer">
          <p>BountyPay by Lucci Labs</p>
          <p><a href="${frontendUrl}">${frontendUrl}</a></p>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `
PR Linked to Bounty!

Hi ${username},

Great news! Your pull request has been linked to a bounty on BountyPay.

Bounty Amount: ${bountyAmount} ${tokenSymbol}

Pull Request: #${prNumber} - ${prTitle || 'View PR'}
${prUrl}

Linked Issue: #${issueNumber}
${issueUrl}

What happens next?
- When your PR is merged and closes issue #${issueNumber}, you'll automatically receive the bounty
- Make sure your wallet is linked to your GitHub account to receive payment
- The bounty will be sent to your linked wallet address

Check your dashboard: ${frontendUrl}/account

---
BountyPay by Lucci Labs
${frontendUrl}
  `.trim();

  return { subject, html, text };
}

