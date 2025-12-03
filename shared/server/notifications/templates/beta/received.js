/**
 * Email template for beta application received
 */
export function renderBetaReceivedEmail({ username, frontendUrl }) {
  const subject = 'BountyPay beta application received';
  const logoUrl = `${frontendUrl}/icons/og.png`;

  const html = `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1.0"
        />
        <title>${subject}</title>
        <style>
          body {
            margin: 0;
            padding: 0;
            background-color: #f3f4f6;
            -webkit-font-smoothing: antialiased;
          }
        </style>
      </head>
      <body>
        <table
          role="presentation"
          width="100%"
          cellspacing="0"
          cellpadding="0"
          border="0"
          style="background-color: #f3f4f6; padding: 24px 0;"
        >
          <tr>
            <td align="center">
              <!-- Main card -->
              <table
                role="presentation"
                width="100%"
                cellspacing="0"
                cellpadding="0"
                border="0"
                style="
                  max-width: 640px;
                  width: 100%;
                  background-color: #ffffff;
                  border-radius: 12px;
                  padding: 32px 40px;
                  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.08);
                  box-sizing: border-box;
                  font-family: -apple-system, BlinkMacSystemFont, system-ui,
                    'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
                  color: #111827;
                "
              >
                <!-- Brand header -->
                <tr>
                  <td align="center" style="padding-bottom: 24px;">
                    <table
                      role="presentation"
                      cellspacing="0"
                      cellpadding="0"
                      border="0"
                      style="margin: 0 auto;"
                    >
                      <tr>
                        <td style="padding-right: 8px;">
                          <img
                            src="${logoUrl}"
                            alt="BountyPay"
                            width="34"
                            height="30"
                            style="display: block; border-radius: 6px;"
                          />
                        </td>
                        <td
                          style="
                            font-family: 'Instrument Serif', Georgia, serif;
                            font-size: 20px;
                            font-weight: 400;
                            line-height: 1.2;
                            letter-spacing: -0.01em;
                            color: #111827;
                            white-space: nowrap;
                          "
                        >
                          BountyPay
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Greeting -->
                <tr>
                  <td
                    style="
                      font-size: 14px;
                      line-height: 1.7;
                      padding-bottom: 4px;
                    "
                  >
                    Hi <strong>${username}</strong>,
                  </td>
                </tr>

                <!-- Main copy -->
                <tr>
                  <td
                    style="
                      font-size: 14px;
                      line-height: 1.7;
                      padding-bottom: 16px;
                    "
                  >
                    Thanks for your interest in BountyPay. We've received your
                    request for beta access and added it to our review queue.
                  </td>
                </tr>

                <!-- What happens next -->
                <tr>
                  <td
                    style="
                      font-size: 13px;
                      line-height: 1.7;
                      padding-bottom: 16px;
                    "
                  >
                    <strong>What happens next:</strong>
                    <ul style="margin: 6px 0 0 18px; padding: 0;">
                      <li>We review applications on a rolling basis</li>
                      <li>You'll receive an email as soon as a decision is made</li>
                      <li>Typical review time is 1–3 business days</li>
                    </ul>
                  </td>
                </tr>

                <!-- Overview of BountyPay -->
                <tr>
                  <td
                    style="
                      font-size: 13px;
                      line-height: 1.7;
                      padding-bottom: 16px;
                    "
                  >
                    <strong>What BountyPay offers:</strong>
                    <ul style="margin: 6px 0 0 18px; padding: 0;">
                      <li><strong>Sponsors:</strong> create crypto bounties on GitHub issues</li>
                      <li><strong>Contributors:</strong> earn rewards by fixing issues and submitting PRs</li>
                      <li><strong>Automatic payouts:</strong> when a PR is merged and closes the bounty issue</li>
                    </ul>
                  </td>
                </tr>

                <tr>
                  <td
                    style="
                      font-size: 12px;
                      color: #6b7280;
                      border-top: 1px solid #e5e7eb;
                      padding-top: 12px;
                    "
                  >
                    You are receiving this email because you requested beta
                    access to BountyPay.
                  </td>
                </tr>
              </table>

              <!-- Footer -->
              <table
                role="presentation"
                width="100%"
                cellspacing="0"
                cellpadding="0"
                border="0"
                style="
                  max-width: 640px;
                  width: 100%;
                  margin-top: 16px;
                  font-family: -apple-system, BlinkMacSystemFont, system-ui,
                    'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
                  text-align: center;
                  color: #9ca3af;
                  font-size: 12px;
                "
              >
                <tr>
                  <td style="padding-bottom: 4px;">
                    BountyPay by
                    <a
                      href="https://luccilabs.xyz"
                      style="
                        color: #9ca3af;
                        text-decoration: underline;
                      "
                    >
                      Lucci Labs
                    </a>
                  </td>
                </tr>
                <tr>
                  <td style="padding-bottom: 10px;">
                    <span style="font-size: 11px;">
                      Building payment infrastructure for open source work.
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;

  const text = `
BountyPay beta application received

Hi ${username},

Thanks for your interest in BountyPay. We've received your request for beta access and added it to our review queue.

What happens next:
- We review applications on a rolling basis
- You'll receive an email as soon as a decision is made
- Typical review time is 1–3 business days

What BountyPay offers:
- Sponsors: create crypto bounties on GitHub issues
- Contributors: earn rewards by fixing issues and submitting PRs
- Automatic payouts when a PR is merged and closes the bounty issue

BountyPay by Lucci Labs (luccilabs.xyz)
  `.trim();

  return { subject, html, text };
}