/**
 * Email template for approved beta access
 */
export function renderBetaApprovedEmail({ username, frontendUrl }) {
  const subject = 'Welcome to BountyPay Beta!';

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
          font-size: 28px;
          margin: 0 0 10px 0;
        }
        p {
          margin: 15px 0;
          font-size: 16px;
        }
        .cta-button {
          display: inline-block;
          background-color: #00827B;
          color: #ffffff;
          padding: 14px 32px;
          text-decoration: none;
          border-radius: 6px;
          font-weight: 600;
          margin: 25px 0;
          transition: background-color 0.2s;
        }
        .cta-button:hover {
          background-color: #39BEB7;
        }
        .features {
          background-color: #f9fafb;
          border-left: 4px solid #00827B;
          padding: 20px;
          margin: 25px 0;
        }
        .features ul {
          margin: 10px 0;
          padding-left: 20px;
        }
        .features li {
          margin: 8px 0;
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
          <h1>Welcome to BountyPay Beta!</h1>
        </div>

        <p>Hi <strong>${username}</strong>,</p>

        <p>Great news! Your application for BountyPay beta access has been <strong>approved</strong>.</p>

        <p>You can now start using BountyPay to create bounties on GitHub issues and claim rewards for solving them.</p>

        <div style="text-align: center;">
          <a href="${frontendUrl}" class="cta-button">Get Started with BountyPay</a>
        </div>

        <div class="features">
          <strong>What you can do:</strong>
          <ul>
            <li>Create bounties on any GitHub issue in repositories with our app installed</li>
            <li>Claim bounties by submitting PRs that fix issues</li>
            <li>Link your wallet to receive automatic payments when PRs are merged</li>
            <li>Track all your bounties in the dashboard</li>
          </ul>
        </div>

        <p>If you have any questions or need help getting started, feel free to reach out to us.</p>

        <p>Happy bounty hunting!</p>

        <div class="footer">
          <p>BountyPay by Lucci Labs</p>
          <p><a href="${frontendUrl}" style="color: #00827B; text-decoration: none;">${frontendUrl}</a></p>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `
Welcome to BountyPay Beta!

Hi ${username},

Great news! Your application for BountyPay beta access has been approved.

You can now start using BountyPay to create bounties on GitHub issues and claim rewards for solving them.

Get started: ${frontendUrl}

What you can do:
- Create bounties on any GitHub issue in repositories with our app installed
- Claim bounties by submitting PRs that fix issues
- Link your wallet to receive automatic payments when PRs are merged
- Track all your bounties in the dashboard

If you have any questions or need help getting started, feel free to reach out to us.

Happy bounty hunting!

---
BountyPay by Lucci Labs
${frontendUrl}
  `.trim();

  return { subject, html, text };
}

