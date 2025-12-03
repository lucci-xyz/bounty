/**
 * Shared email layout wrapper for all BountyPay transactional emails.
 * Provides consistent branding, styling, and structure.
 */

/**
 * Creates HTML email with consistent branding and layout.
 * @param {Object} options
 * @param {string} options.subject - Email subject line
 * @param {string} options.logoUrl - URL to BountyPay logo
 * @param {string} options.bodyContent - Main HTML content for the email body
 * @param {string} [options.footerNote] - Optional note to display above footer
 * @returns {string} Complete HTML email
 */
export function wrapInEmailLayout({ subject, logoUrl, bodyContent, footerNote = '' }) {
  return `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
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

                <!-- Main content -->
                ${bodyContent}

                ${footerNote ? `
                <!-- Footer note -->
                <tr>
                  <td
                    style="
                      font-size: 12px;
                      color: #6b7280;
                      border-top: 1px solid #e5e7eb;
                      padding-top: 12px;
                    "
                  >
                    ${footerNote}
                  </td>
                </tr>
                ` : ''}
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
}

/**
 * Creates a greeting row for the email body.
 * @param {string} username - User's name/username
 * @returns {string} HTML for greeting row
 */
export function renderGreeting(username) {
  return `
    <tr>
      <td style="font-size: 14px; line-height: 1.7; padding-bottom: 4px;">
        Hi <strong>${username}</strong>,
      </td>
    </tr>
  `;
}

/**
 * Creates a paragraph row for the email body.
 * @param {string} text - Paragraph text
 * @param {Object} [options]
 * @param {boolean} [options.bottomPadding=20] - Bottom padding in pixels
 * @returns {string} HTML for paragraph row
 */
export function renderParagraph(text, { bottomPadding = 20 } = {}) {
  return `
    <tr>
      <td style="font-size: 14px; line-height: 1.7; padding-bottom: ${bottomPadding}px;">
        ${text}
      </td>
    </tr>
  `;
}

/**
 * Creates a summary table for bounty details.
 * @param {Array<{label: string, value: string, href?: string}>} rows - Table rows
 * @returns {string} HTML for summary table
 */
export function renderSummaryTable(rows) {
  const rowsHtml = rows.map(({ label, value, href }) => `
    <tr>
      <td
        width="140"
        style="
          padding: 6px 0;
          border-bottom: 1px solid #e5e7eb;
          color: #4b5563;
        "
      >
        ${label}
      </td>
      <td
        style="
          padding: 6px 0;
          border-bottom: 1px solid #e5e7eb;
        "
      >
        ${href 
          ? `<a href="${href}" style="color: #111827; text-decoration: underline;">${value}</a>`
          : value
        }
      </td>
    </tr>
  `).join('');

  return `
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
          ${rowsHtml}
        </table>
      </td>
    </tr>
  `;
}

/**
 * Creates a dashboard link section.
 * @param {string} dashboardUrl - URL to user's dashboard
 * @param {string} [text='You can view this from your dashboard.'] - Description text
 * @returns {string} HTML for dashboard link section
 */
export function renderDashboardLink(dashboardUrl, text = 'You can view this from your dashboard.') {
  return `
    <tr>
      <td style="font-size: 13px; line-height: 1.7; padding-bottom: 4px;">
        ${text}
      </td>
    </tr>
    <tr>
      <td style="font-size: 13px; padding-bottom: 16px;">
        <a
          href="${dashboardUrl}"
          style="color: #111827; text-decoration: underline;"
        >
          Open dashboard
        </a>
      </td>
    </tr>
  `;
}

