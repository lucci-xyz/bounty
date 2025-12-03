/**
 * Email template for approved beta access
 */
export function renderBetaApprovedEmail({ username, frontendUrl }) {
  const subject = 'Welcome to BountyPay Beta';
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
                    Your application for BountyPay beta access has been approved.
                  </td>
                </tr>

                <tr>
                  <td
                    style="
                      font-size: 14px;
                      line-height: 1.7;
                      padding-bottom: 16px;
                    "
                  >
                    You can now use BountyPay to create bounties on GitHub issues
                    and claim rewards for solving them.
                  </td>
                </tr>

                <!-- Features list -->
                <tr>
                  <td
                    style="
                      font-size: 13px;
                      line-height: 1.7;
                      padding-bottom: 16px;
                    "
                  >
                    <strong>With beta access you can:</strong>
                    <ul style="margin: 6px 0 0 18px; padding: 0;">
                      <li>Create bounties on issues in repositories with the BountyPay app installed</li>
                      <li>Claim bounties by submitting pull requests that fix those issues</li>
                      <li>Link your wallet to receive automatic payments when PRs are merged</li>
                      <li>Track all of your bounties from a single dashboard</li>
                    </ul>
                  </td>
                </tr>

                <!-- CTA -->
                <tr>
                  <td style="font-size: 13px; padding-bottom: 16px;">
                    <a
                      href="${frontendUrl}"
                      style="
                        color: #111827;
                        text-decoration: underline;
                      "
                    >
                      Open BountyPay
                    </a>
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
                    You are receiving this email because you applied for early
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
Welcome to BountyPay Beta

Hi ${username},

Your application for BountyPay beta access has been approved.

You can now use BountyPay to create bounties on GitHub issues and claim rewards for solving them.

What you can do:
- Create bounties on issues in repositories with the BountyPay app installed
- Claim bounties by submitting pull requests that fix those issues
- Link your wallet to receive automatic payments when PRs are merged
- Track all of your bounties from a single dashboard

Open BountyPay: ${frontendUrl}

BountyPay by Lucci Labs (luccilabs.xyz)
  `.trim();

  return { subject, html, text };
}
