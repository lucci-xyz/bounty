export function renderMaintainerAlertEmail({
  emoji,
  errorType,
  owner,
  repo,
  issueNumber,
  severityLabel,
  errorId,
  timestamp,
  truncatedError,
  detailsHtml,
  contextHtml
}) {
  return `
    <p>${emoji} <strong>${errorType}</strong></p>
    <p><strong>Repository:</strong> ${owner}/${repo}</p>
    <p><strong>Issue/PR:</strong> #${issueNumber}</p>
    <p><strong>Severity:</strong> ${severityLabel}</p>
    <p><strong>Error ID:</strong> ${errorId}</p>
    <p><strong>Timestamp:</strong> ${timestamp}</p>
    <p><strong>Error Details:</strong></p>
    <pre>${truncatedError}</pre>
    ${detailsHtml || ''}
    ${contextHtml || ''}
  `;
}

