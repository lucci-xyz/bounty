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

  const subject = `Your bounty has expired`;

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
                            font-size: 15px;
                            font-weight: 600;
                            letter-spacing: 0.06em;
                            text-transform: uppercase;
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

                <!-- Main line -->
                <tr>
                  <td
                    style="
                      font-size: 14px;
                      line-height: 1.7;
                      padding-bottom: 20px;
                    "
                  >
                    You have a bounty that has reached its deadline and is now expired.
                  </td>
                </tr>

                <!-- Summary table -->
                <tr>
                  <td>
                    <table
                      role="presentation"
                      width="100%"
                      cellspacing="0"
                      cellpadding="0"
                      border="0"
                      style="
                        border-collapse: collapse;
                        font-size: 13px;
                        margin-bottom: 24px;
                      "
                    >
                      <tr>
                        <td
                          width="140"
                          style="
                            padding: 6px 0;
                            border-bottom: 1px solid #e5e7eb;
                            color: #4b5563;
                          "
                        >
                          Bounty amount
                        </td>
                        <td
                          style="
                            padding: 6px 0;
                            border-bottom: 1px solid #e5e7eb;
                          "
                        >
                          ${bountyAmount} ${tokenSymbol}
                        </td>
                      </tr>
                      <tr>
                        <td
                          style="
                            padding: 6px 0;
                            border-bottom: 1px solid #e5e7eb;
                            color: #4b5563;
                          "
                        >
                          Repository
                        </td>
                        <td
                          style="
                            padding: 6px 0;
                            border-bottom: 1px solid #e5e7eb;
                          "
                        >
                          ${repoFullName}
                        </td>
                      </tr>
                      <tr>
                        <td
                          style="
                            padding: 6px 0;
                            border-bottom: 1px solid #e5e7eb;
                            color: #4b5563;
                          "
                        >
                          Issue
                        </td>
                        <td
                          style="
                            padding: 6px 0;
                            border-bottom: 1px solid #e5e7eb;
                          "
                        >
                          <a
                            href="${issueUrl}"
                            style="color: #111827; text-decoration: underline;"
                          >
                            #${issueNumber}${
    issueTitle ? ` — ${issueTitle}` : ""
  }
                          </a>
                        </td>
                      </tr>
                      <tr>
                        <td
                          style="
                            padding: 6px 0;
                            border-bottom: 1px solid #e5e7eb;
                            color: #4b5563;
                          "
                        >
                          Status
                        </td>
                        <td
                          style="
                            padding: 6px 0;
                            border-bottom: 1px solid #e5e7eb;
                          "
                        >
                          Eligible for refund
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Dashboard link -->
                <tr>
                  <td
                    style="
                      font-size: 13px;
                      line-height: 1.7;
                      padding-bottom: 4px;
                    "
                  >
                    You can manage this bounty from your dashboard.
                  </td>
                </tr>
                <tr>
                  <td style="font-size: 13px; padding-bottom: 16px;">
                    <a
                      href="${frontendUrl}/account"
                      style="
                        color: #111827;
                        text-decoration: underline;
                      "
                    >
                      Open dashboard
                    </a>
                  </td>
                </tr>

                <!-- Note -->
                <tr>
                  <td
                    style="
                      font-size: 12px;
                      color: #6b7280;
                      border-top: 1px solid #e5e7eb;
                      padding-top: 12px;
                    "
                  >
                    The issue itself remains open on GitHub. Only the bounty reward has expired.
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
                    BountyPay by Lucci Labs
                  </td>
                </tr>
                <tr>
                  <td style="padding-bottom: 10px;">
                    <span style="font-size: 11px;">
                      Building payment infrastructure for open source work.
                    </span>
                  </td>
                </tr>
                <tr>
                  <td>
                    <table
                      role="presentation"
                      cellspacing="0"
                      cellpadding="0"
                      border="0"
                      align="center"
                    >
                      <tr>
                        <td style="padding: 0 4px;">
                          <a
                            href="https://luccilabs.xyz"
                            style="
                              text-decoration: none;
                              color: #6b7280;
                              font-size: 11px;
                            "
                          >
                            <span
                              style="
                                display: inline-block;
                                padding: 3px 8px;
                              "
                            >
                              Website
                            </span>
                          </a>
                        </td>
                        <td style="padding: 0 4px;">
                          <a
                            href="https://github.com/lucci-xyz"
                            style="
                              text-decoration: none;
                              color: #6b7280;
                              font-size: 11px;
                            "
                          >
                            <span
                              style="
                                display: inline-block;
                                padding: 3px 8px;
                              "
                            >
                              GitHub
                            </span>
                          </a>
                        </td>
                        <td style="padding: 0 4px;">
                          <a
                            href="https://x.com/LucciLabs"
                            style="
                              text-decoration: none;
                              color: #6b7280;
                              font-size: 11px;
                            "
                          >
                            <span
                              style="
                                display: inline-block;
                                padding: 3px 8px;
                              "
                            >
                              X
                            </span>
                          </a>
                        </td>
                        <td style="padding: 0 4px;">
                          <a
                            href="https://discord.gg/MWxWzRVSx"
                            style="
                              text-decoration: none;
                              color: #6b7280;
                              font-size: 11px;
                            "
                          >
                            <span
                              style="
                                display: inline-block;
                                padding: 3px 8px;
                              "
                            >
                              Discord
                            </span>
                          </a>
                        </td>
                      </tr>
                    </table>
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
Bounty expired

Hi ${username},

You have a bounty that has reached its deadline and is now expired.

Bounty amount: ${bountyAmount} ${tokenSymbol}
Repository: ${repoFullName}
Issue: #${issueNumber}${issueTitle ? ` - ${issueTitle}` : ''} (${issueUrl})
Status: Eligible for refund

Manage this bounty from your dashboard: ${frontendUrl}/account

The issue itself remains open on GitHub. Only the bounty reward has expired.

BountyPay by Lucci Labs
Website: luccilabs.xyz
GitHub: github.com/lucci-xyz
X: x.com/LucciLabs
Discord: discord.gg/MWxWzRVSx
  `.trim();

  return { subject, html, text };
}
