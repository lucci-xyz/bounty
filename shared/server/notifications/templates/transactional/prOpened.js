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
  const logoUrl = `${frontendUrl}/icons/og.png`;

  const subject = `Your PR #${prNumber} is linked to a ${bountyAmount} ${tokenSymbol} bounty`;

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

                <!-- Main copy -->
                <tr>
                  <td
                    style="
                      font-size: 14px;
                      line-height: 1.7;
                      padding-bottom: 20px;
                    "
                  >
                    Your pull request has been linked to a bounty on BountyPay.
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
                            #${issueNumber}
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
                          Pull request
                        </td>
                        <td
                          style="
                            padding: 6px 0;
                            border-bottom: 1px solid #e5e7eb;
                          "
                        >
                          <a
                            href="${prUrl}"
                            style="color: #111827; text-decoration: underline;"
                          >
                            #${prNumber}${
    prTitle ? ` — ${prTitle}` : ""
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
                          Linked to bounty
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Note -->
                <tr>
                  <td
                    style="
                      font-size: 13px;
                      line-height: 1.7;
                      padding-bottom: 4px;
                    "
                  >
                    When your pull request is merged and closes the linked issue,
                    the bounty will be paid to your linked wallet.
                  </td>
                </tr>

                <tr>
                  <td
                    style="
                      font-size: 13px;
                      line-height: 1.7;
                      padding-bottom: 16px;
                    "
                  >
                    You can review your bounties and wallet settings in your
                    dashboard.
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

                <tr>
                  <td
                    style="
                      font-size: 12px;
                      color: #6b7280;
                      border-top: 1px solid #e5e7eb;
                      padding-top: 12px;
                    "
                  >
                    Make sure your wallet is linked to your GitHub account so you
                    can receive the bounty when it is paid out.
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
PR linked to bounty

Hi ${username},

Your pull request has been linked to a bounty on BountyPay.

Bounty amount: ${bountyAmount} ${tokenSymbol}
Repository: ${repoFullName}
Issue: #${issueNumber} (${issueUrl})
Pull request: #${prNumber}${prTitle ? ` - ${prTitle}` : ''} (${prUrl})
Status: Linked to bounty

When your pull request is merged and closes the linked issue, the bounty will be paid to your linked wallet.

Manage your settings in your dashboard: ${frontendUrl}/account

BountyPay by Lucci Labs (luccilabs.xyz)
  `.trim();

  return { subject, html, text };
}