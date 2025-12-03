/**
 * Email template for error notifications affecting a user
 */
export function renderUserErrorEmail({
  username,
  errorType,
  errorMessage,
  context,
  repoFullName,
  issueNumber,
  prNumber,
  bountyId,
  frontendUrl
}) {
  const issueUrl = issueNumber
    ? `https://github.com/${repoFullName}/issues/${issueNumber}`
    : null;
  const prUrl = prNumber
    ? `https://github.com/${repoFullName}/pull/${prNumber}`
    : null;
  const logoUrl = `${frontendUrl}/icons/og.png`;

  const subject = `[BountyPay] Action required: ${errorType}`;

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
                    We ran into an issue while processing one of your actions on
                    BountyPay. Our team has been notified and is looking into it.
                  </td>
                </tr>

                <!-- Error box -->
                <tr>
                  <td style="padding-bottom: 16px;">
                    <table
                      role="presentation"
                      width="100%"
                      cellspacing="0"
                      cellpadding="0"
                      border="0"
                      style="
                        border-collapse: collapse;
                        font-size: 13px;
                        background-color: #fef2f2;
                        border-radius: 8px;
                        border: 1px solid #fecaca;
                      "
                    >
                      <tr>
                        <td
                          style="
                            padding: 10px 14px 4px 14px;
                            font-weight: 600;
                            color: #b91c1c;
                          "
                        >
                          ${errorType}
                        </td>
                      </tr>
                      ${
                        errorMessage
                          ? `
                      <tr>
                        <td
                          style="
                            padding: 0 14px 12px 14px;
                            font-family: Menlo, Monaco, Consolas, 'Liberation Mono',
                              'Courier New', monospace;
                            font-size: 12px;
                            color: #4b5563;
                            background-color: #f9fafb;
                            border-radius: 4px;
                          "
                        >
                          ${errorMessage}
                        </td>
                      </tr>
                      `
                          : ""
                      }
                    </table>
                  </td>
                </tr>

                ${
                  context
                    ? `
                <tr>
                  <td
                    style="
                      font-size: 13px;
                      line-height: 1.7;
                      padding-bottom: 16px;
                    "
                  >
                    <strong>Context:</strong> ${context}
                  </td>
                </tr>
                `
                    : ""
                }

                ${
                  repoFullName || bountyId
                    ? `
                <tr>
                  <td
                    style="
                      font-size: 13px;
                      line-height: 1.7;
                      padding-bottom: 16px;
                    "
                  >
                    <strong>Related information:</strong>
                    <ul style="margin: 6px 0 0 18px; padding: 0;">
                      ${
                        repoFullName
                          ? `<li>Repository: ${repoFullName}</li>`
                          : ""
                      }
                      ${
                        issueUrl
                          ? `<li>Issue: <a href="${issueUrl}" style="color: #111827; text-decoration: underline;">#${issueNumber}</a></li>`
                          : ""
                      }
                      ${
                        prUrl
                          ? `<li>PR: <a href="${prUrl}" style="color: #111827; text-decoration: underline;">#${prNumber}</a></li>`
                          : ""
                      }
                      ${
                        bountyId
                          ? `<li>Bounty ID: ${bountyId.slice(
                              0,
                              10
                            )}...${bountyId.slice(-8)}</li>`
                          : ""
                      }
                    </ul>
                  </td>
                </tr>
                `
                    : ""
                }

                <!-- Guidance -->
                <tr>
                  <td
                    style="
                      font-size: 13px;
                      line-height: 1.7;
                      padding-bottom: 4px;
                    "
                  >
                    You can check your dashboard to verify the status of your
                    bounties and related activity.
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
                    If the problem continues, you can reply to this email with
                    any additional details and we will help you resolve it.
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
                    You are receiving this email because an error occurred while
                    processing a BountyPay action associated with your account.
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
Issue detected

Hi ${username},

We ran into an issue while processing one of your actions on BountyPay. Our team has been notified and is looking into it.

Error type: ${errorType}
${errorMessage ? `Details: ${errorMessage}` : ''}
${context ? `Context: ${context}` : ''}

${
  repoFullName || bountyId
    ? `Related information:
${repoFullName ? `- Repository: ${repoFullName}\n` : ''}${
        issueUrl ? `- Issue: #${issueNumber} (${issueUrl})\n` : ''
      }${prUrl ? `- PR: #${prNumber} (${prUrl})\n` : ''}${
        bountyId
          ? `- Bounty ID: ${bountyId.slice(0, 10)}...${bountyId.slice(-8)}\n`
          : ''
      }`
    : ''
}

You can check your dashboard to verify the status of your bounties. If the problem continues, reply to this email with any additional details.

View dashboard: ${frontendUrl}/account

BountyPay by Lucci Labs (luccilabs.xyz)
  `.trim();

  return { subject, html, text };
}

/**
 * Email template for ops team error alerts
 * (kept in a compact, monospace style for internal use)
 */
export function renderOpsErrorEmail({
  errorType,
  errorMessage,
  context,
  repoFullName,
  issueNumber,
  prNumber,
  bountyId,
  network,
  username,
  userEmail,
  timestamp
}) {
  const issueUrl = issueNumber
    ? `https://github.com/${repoFullName}/issues/${issueNumber}`
    : null;
  const prUrl = prNumber
    ? `https://github.com/${repoFullName}/pull/${prNumber}`
    : null;

  const subject = `[ALERT] ${errorType} - ${repoFullName || 'BountyPay'}`;

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
            font-family: Menlo, Monaco, Consolas, 'Liberation Mono',
              'Courier New', monospace;
            font-size: 13px;
            color: #f9fafb;
            max-width: 760px;
            margin: 0 auto;
            padding: 20px;
            background-color: #111827;
          }
          .container {
            background-color: #020617;
            border-radius: 8px;
            padding: 20px;
            border: 1px solid #1f2937;
          }
          h1 {
            color: #f97316;
            font-size: 14px;
            margin: 0 0 12px 0;
            text-transform: uppercase;
            letter-spacing: 0.08em;
          }
          .field {
            margin: 6px 0;
          }
          .label {
            color: #9ca3af;
          }
          .value {
            color: #e5e7eb;
          }
          pre {
            background-color: #020617;
            border-radius: 4px;
            padding: 12px;
            overflow-x: auto;
            color: #facc15;
            border: 1px solid #1f2937;
          }
          .section {
            margin-top: 16px;
            padding-top: 12px;
            border-top: 1px solid #1f2937;
          }
          .section-title {
            color: #9ca3af;
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 0.08em;
            margin-bottom: 6px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>${errorType}</h1>

          <div class="field">
            <span class="label">Timestamp:</span>
            <span class="value">${timestamp || new Date().toISOString()}</span>
          </div>

          ${
            username
              ? `
          <div class="section">
            <div class="section-title">User</div>
            <div class="field">
              <span class="label">Username:</span>
              <span class="value">${username}</span>
            </div>
            ${
              userEmail
                ? `<div class="field">
              <span class="label">Email:</span>
              <span class="value">${userEmail}</span>
            </div>`
                : ""
            }
          </div>
          `
              : ""
          }

          <div class="section">
            <div class="section-title">Error</div>
            <pre>${errorMessage || "No additional details"}</pre>
            ${
              context
                ? `<div class="field">
              <span class="label">Context:</span>
              <span class="value">${context}</span>
            </div>`
                : ""
            }
          </div>

          ${
            repoFullName || bountyId || network
              ? `
          <div class="section">
            <div class="section-title">Resources</div>
            ${
              repoFullName
                ? `<div class="field">
              <span class="label">Repository:</span>
              <span class="value">${repoFullName}</span>
            </div>`
                : ""
            }
            ${
              issueUrl
                ? `<div class="field">
              <span class="label">Issue:</span>
              <span class="value">#${issueNumber} - ${issueUrl}</span>
            </div>`
                : ""
            }
            ${
              prUrl
                ? `<div class="field">
              <span class="label">PR:</span>
              <span class="value">#${prNumber} - ${prUrl}</span>
            </div>`
                : ""
            }
            ${
              bountyId
                ? `<div class="field">
              <span class="label">Bounty ID:</span>
              <span class="value">${bountyId}</span>
            </div>`
                : ""
            }
            ${
              network
                ? `<div class="field">
              <span class="label">Network:</span>
              <span class="value">${network}</span>
            </div>`
                : ""
            }
          </div>
          `
              : ""
          }
        </div>
      </body>
    </html>
  `;

  const text = `
[ALERT] ${errorType}
==================================================

Timestamp: ${timestamp || new Date().toISOString()}

${
  username
    ? `User:
- Username: ${username}
${userEmail ? `- Email: ${userEmail}` : ''}

`
    : ''
}Error:
${errorMessage || 'No additional details'}
${context ? `\nContext: ${context}` : ''}

${
  repoFullName || bountyId || network
    ? `Resources:
${repoFullName ? `- Repository: ${repoFullName}\n` : ''}${
        issueUrl ? `- Issue: #${issueNumber} - ${issueUrl}\n` : ''
      }${prUrl ? `- PR: #${prNumber} - ${prUrl}\n` : ''}${
        bountyId ? `- Bounty ID: ${bountyId}\n` : ''
      }${network ? `- Network: ${network}\n` : ''}`
    : ''
}
  `.trim();

  return { subject, html, text };
}
