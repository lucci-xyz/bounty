/**
 * Email template for rejected beta access
 */
export function renderBetaRejectedEmail({ username, frontendUrl }) {
  const subject = 'BountyPay Beta Application Update';

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
          color: #1f2937;
          font-size: 24px;
          margin: 0 0 10px 0;
        }
        p {
          margin: 15px 0;
          font-size: 16px;
        }
        .info-box {
          background-color: #f9fafb;
          border-left: 4px solid #6b7280;
          padding: 20px;
          margin: 25px 0;
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
          <h1>BountyPay Beta Application Update</h1>
        </div>

        <p>Hi <strong>${username}</strong>,</p>

        <p>Thank you for your interest in BountyPay beta access.</p>

        <p>Unfortunately, we're unable to approve your application at this time. Our beta program has limited capacity, and we're carefully managing the number of early users.</p>

        <div class="info-box">
          <p style="margin: 0;"><strong>What's next?</strong></p>
          <p style="margin: 10px 0 0 0;">We'll keep your application on file and reach out if spots become available. We appreciate your patience and interest in BountyPay.</p>
        </div>

        <p>Stay tuned for updates on our public launch!</p>

        <div class="footer">
          <p>BountyPay by Lucci Labs</p>
          <p><a href="${frontendUrl}" style="color: #00827B; text-decoration: none;">${frontendUrl}</a></p>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `
BountyPay Beta Application Update

Hi ${username},

Thank you for your interest in BountyPay beta access.

Unfortunately, we're unable to approve your application at this time. Our beta program has limited capacity, and we're carefully managing the number of early users.

What's next?
We'll keep your application on file and reach out if spots become available. We appreciate your patience and interest in BountyPay.

Stay tuned for updates on our public launch!

---
BountyPay by Lucci Labs
${frontendUrl}
  `.trim();

  return { subject, html, text };
}

