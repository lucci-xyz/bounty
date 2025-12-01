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
  const issueUrl = issueNumber ? `https://github.com/${repoFullName}/issues/${issueNumber}` : null;
  const prUrl = prNumber ? `https://github.com/${repoFullName}/pull/${prNumber}` : null;
  
  const subject = `[BountyPay] Action Required: ${errorType}`;

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
          color: #dc2626;
          font-size: 24px;
          margin: 0 0 10px 0;
        }
        p {
          margin: 15px 0;
          font-size: 16px;
        }
        .error-box {
          background-color: #fef2f2;
          border-left: 4px solid #dc2626;
          padding: 16px 20px;
          margin: 20px 0;
          border-radius: 0 8px 8px 0;
        }
        .error-type {
          font-weight: 600;
          color: #dc2626;
          margin-bottom: 8px;
        }
        .error-message {
          font-family: 'Menlo', 'Monaco', monospace;
          font-size: 13px;
          color: #6b7280;
          background-color: #f3f4f6;
          padding: 8px 12px;
          border-radius: 4px;
          word-break: break-all;
        }
        .info-box {
          background-color: #f0f9ff;
          border-left: 4px solid #0284c7;
          padding: 16px 20px;
          margin: 20px 0;
          border-radius: 0 8px 8px 0;
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
          <h1>⚠️ Issue Detected</h1>
        </div>

        <p>Hi <strong>${username}</strong>,</p>

        <p>We encountered an issue while processing one of your bounty-related actions. Our team has been notified and is looking into it.</p>

        <div class="error-box">
          <p class="error-type">${errorType}</p>
          ${errorMessage ? `<p class="error-message">${errorMessage}</p>` : ''}
        </div>

        ${context ? `
        <div class="info-box">
          <p style="margin: 0;"><strong>Context:</strong> ${context}</p>
        </div>
        ` : ''}

        ${(repoFullName || bountyId) ? `
        <p><strong>Related Information:</strong></p>
        <ul>
          ${repoFullName ? `<li><strong>Repository:</strong> ${repoFullName}</li>` : ''}
          ${issueUrl ? `<li><strong>Issue:</strong> <a href="${issueUrl}">#${issueNumber}</a></li>` : ''}
          ${prUrl ? `<li><strong>PR:</strong> <a href="${prUrl}">#${prNumber}</a></li>` : ''}
          ${bountyId ? `<li><strong>Bounty ID:</strong> ${bountyId.slice(0, 10)}...${bountyId.slice(-8)}</li>` : ''}
        </ul>
        ` : ''}

        <p><strong>What you can do:</strong></p>
        <ul>
          <li>Check your dashboard to verify the status of your bounties</li>
          <li>If the issue persists, contact our support team</li>
          <li>No action may be needed if this was a temporary issue</li>
        </ul>

        <div style="text-align: center;">
          <a href="${frontendUrl}/account" class="cta-button">View Dashboard</a>
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
Issue Detected

Hi ${username},

We encountered an issue while processing one of your bounty-related actions. Our team has been notified and is looking into it.

Error Type: ${errorType}
${errorMessage ? `Details: ${errorMessage}` : ''}
${context ? `\nContext: ${context}` : ''}

${repoFullName || bountyId ? `Related Information:` : ''}
${repoFullName ? `- Repository: ${repoFullName}` : ''}
${issueUrl ? `- Issue: #${issueNumber} (${issueUrl})` : ''}
${prUrl ? `- PR: #${prNumber} (${prUrl})` : ''}
${bountyId ? `- Bounty ID: ${bountyId.slice(0, 10)}...${bountyId.slice(-8)}` : ''}

What you can do:
- Check your dashboard to verify the status of your bounties
- If the issue persists, contact our support team
- No action may be needed if this was a temporary issue

View dashboard: ${frontendUrl}/account

---
BountyPay by Lucci Labs
${frontendUrl}
  `.trim();

  return { subject, html, text };
}

/**
 * Email template for ops team error alerts
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
  const issueUrl = issueNumber ? `https://github.com/${repoFullName}/issues/${issueNumber}` : null;
  const prUrl = prNumber ? `https://github.com/${repoFullName}/pull/${prNumber}` : null;
  
  const subject = `[ALERT] ${errorType} - ${repoFullName || 'BountyPay'}`;

  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body {
          font-family: 'Menlo', 'Monaco', monospace;
          font-size: 13px;
          color: #1f2937;
          max-width: 700px;
          margin: 0 auto;
          padding: 20px;
          background-color: #1f2937;
        }
        .container {
          background-color: #111827;
          border-radius: 8px;
          padding: 24px;
          border: 1px solid #374151;
        }
        h1 {
          color: #ef4444;
          font-size: 16px;
          margin: 0 0 20px 0;
          text-transform: uppercase;
          letter-spacing: 1px;
        }
        .field {
          margin: 8px 0;
          padding: 8px 12px;
          background-color: #1f2937;
          border-radius: 4px;
        }
        .field-label {
          color: #9ca3af;
          margin-right: 8px;
        }
        .field-value {
          color: #f3f4f6;
        }
        .field-value.error {
          color: #ef4444;
        }
        .field-value.link {
          color: #60a5fa;
        }
        .section {
          margin: 20px 0;
          padding-top: 16px;
          border-top: 1px solid #374151;
        }
        .section-title {
          color: #9ca3af;
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 1px;
          margin-bottom: 12px;
        }
        pre {
          background-color: #1f2937;
          padding: 12px;
          border-radius: 4px;
          overflow-x: auto;
          color: #fbbf24;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>🚨 ${errorType}</h1>
        
        <div class="field">
          <span class="field-label">Timestamp:</span>
          <span class="field-value">${timestamp || new Date().toISOString()}</span>
        </div>
        
        ${username ? `
        <div class="section">
          <div class="section-title">Affected User</div>
          <div class="field">
            <span class="field-label">Username:</span>
            <span class="field-value">${username}</span>
          </div>
          ${userEmail ? `
          <div class="field">
            <span class="field-label">Email:</span>
            <span class="field-value">${userEmail}</span>
          </div>
          ` : ''}
        </div>
        ` : ''}
        
        <div class="section">
          <div class="section-title">Error Details</div>
          ${errorMessage ? `<pre>${errorMessage}</pre>` : '<pre>No additional details</pre>'}
          ${context ? `
          <div class="field" style="margin-top: 12px;">
            <span class="field-label">Context:</span>
            <span class="field-value">${context}</span>
          </div>
          ` : ''}
        </div>
        
        ${(repoFullName || bountyId || network) ? `
        <div class="section">
          <div class="section-title">Related Resources</div>
          ${repoFullName ? `
          <div class="field">
            <span class="field-label">Repository:</span>
            <span class="field-value">${repoFullName}</span>
          </div>
          ` : ''}
          ${issueUrl ? `
          <div class="field">
            <span class="field-label">Issue:</span>
            <span class="field-value link">#${issueNumber} - ${issueUrl}</span>
          </div>
          ` : ''}
          ${prUrl ? `
          <div class="field">
            <span class="field-label">PR:</span>
            <span class="field-value link">#${prNumber} - ${prUrl}</span>
          </div>
          ` : ''}
          ${bountyId ? `
          <div class="field">
            <span class="field-label">Bounty ID:</span>
            <span class="field-value">${bountyId}</span>
          </div>
          ` : ''}
          ${network ? `
          <div class="field">
            <span class="field-label">Network:</span>
            <span class="field-value">${network}</span>
          </div>
          ` : ''}
        </div>
        ` : ''}
      </div>
    </body>
    </html>
  `;

  const text = `
[ALERT] ${errorType}
${'='.repeat(50)}

Timestamp: ${timestamp || new Date().toISOString()}

${username ? `AFFECTED USER
Username: ${username}
${userEmail ? `Email: ${userEmail}` : ''}
` : ''}

ERROR DETAILS
${errorMessage || 'No additional details'}
${context ? `Context: ${context}` : ''}

${repoFullName || bountyId || network ? `RELATED RESOURCES
${repoFullName ? `Repository: ${repoFullName}` : ''}
${issueUrl ? `Issue: #${issueNumber} - ${issueUrl}` : ''}
${prUrl ? `PR: #${prNumber} - ${prUrl}` : ''}
${bountyId ? `Bounty ID: ${bountyId}` : ''}
${network ? `Network: ${network}` : ''}
` : ''}
  `.trim();

  return { subject, html, text };
}

