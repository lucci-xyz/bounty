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
  const logoUrl = `${frontendUrl}/icons/og.png`;

  const subject = `Your ${bountyAmount} ${tokenSymbol} bounty has expired`;

  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <style>
        body {
          margin: 0;
          padding: 24px 0;
          background-color: #f3f4f6;
          font-family: -apple-system, BlinkMacSystemFont, system-ui, -system-ui,
            "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
          color: #111827;
          line-height: 1.6;
        }
        .container {
          max-width: 640px;
          margin: 0 auto;
          background-color: #ffffff;
          border-radius: 8px;
          padding: 32px;
          box-shadow: 0 1px 3px rgba(15, 23, 42, 0.08);
        }
        .header {
          text-align: left;
          margin-bottom: 24px;
        }
        .logo {
          height: 24px;
        }
        h1 {
          font-size: 22px;
          font-weight: 600;
          margin: 16px 0 8px;
          color: #111827;
        }
        p {
          margin: 12px 0;
          font-size: 15px;
        }
        .summary {
          width: 100%;
          border-collapse: collapse;
          margin: 20px 0;
          font-size: 14px;
        }
        .summary th,
        .summary td {
          padding: 8px 0;
          border-bottom: 1px solid #e5e7eb;
          text-align: left;
        }
        .summary th {
          width: 120px;
          font-weight: 500;
          color: #4b5563;
        }
        .section-title {
          font-weight: 600;
          margin-top: 24px;
          margin-bottom: 8px;
          font-size: 15px;
        }
        ul {
          margin: 8px 0 16px 20px;
          padding: 0;
          font-size: 14px;
        }
        li {
          margin-bottom: 6px;
        }
        a {
          color: #111827;
          text-decoration: underline;
        }
        .footer {
          margin-top: 32px;
          padding-top: 16px;
          border-top: 1px solid #e5e7eb;
          font-size: 13px;
          color: #6b7280;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <img src="${logoUrl}" alt="BountyPay" class="logo" />
          <h1>Bounty expired</h1>
        </div>

        <p>Hi <strong>${username}</strong>,</p>

        <p>
          Your bounty on issue
          <a href="${issueUrl}">#${issueNumber}${issueTitle ? ` — ${issueTitle}` : ''}</a>
          has reached its deadline and is now expired.
        </p>

        <table class="summary" role="presentation">
          <tr>
            <th>Bounty amount</th>
            <td>${bountyAmount} ${tokenSymbol}</td>
          </tr>
          <tr>
            <th>Repository</th>
            <td>${repoFullName}</td>
          </tr>
          <tr>
            <th>Issue</th>
            <td><a href="${issueUrl}">#${issueNumber}</a></td>
          </tr>
          <tr>
            <th>Status</th>
            <td>Eligible for refund</td>
          </tr>
        </table>

        <p class="section-title">What you can do next</p>
        <ul>
          <li><strong>Request a refund:</strong> Claim your funds back from your dashboard.</li>
          <li><strong>Create a new bounty:</strong> If you still need the issue solved, open a new bounty with an updated deadline.</li>
        </ul>

        <p>
          You can manage this bounty from your dashboard:
          <a href="${frontendUrl}/account">${frontendUrl}/account</a>
        </p>

        <p style="font-size: 13px; color: #6b7280;">
          The issue itself remains open on GitHub. Only the bounty reward has expired.
        </p>

        <div class="footer">
          <p>BountyPay by Lucci Labs</p>
          <p><a href="${frontendUrl}">${frontendUrl}</a></p>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `
Bounty expired

Hi ${username},

Your bounty on issue #${issueNumber}${issueTitle ? ` - ${issueTitle}` : ''} has reached its deadline and is now expired.

Bounty amount: ${bountyAmount} ${tokenSymbol}
Repository: ${repoFullName}
Issue: #${issueNumber}
${issueUrl}

Status: Eligible for refund

What you can do next:
- Request a refund: claim your funds back from your dashboard.
- Create a new bounty: if you still need the issue solved, open a new bounty with an updated deadline.

Manage this bounty from your dashboard: ${frontendUrl}/account

The issue itself remains open on GitHub. Only the bounty reward has expired.

---
BountyPay by Lucci Labs
${frontendUrl}
  `.trim();

  return { subject, html, text };
}