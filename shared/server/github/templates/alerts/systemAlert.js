/**
 * Comment posted to notify maintainers of a system error.
 */
export function renderSystemAlertComment({
  severityLabel,
  errorId,
  errorType,
  timestamp,
  truncatedError,
  detailsSection,
  context,
  troubleshootingUrl,
  brandSignature
}) {
  const infoSection = detailsSection ? `### System Information\n${detailsSection}\n` : '';
  const contextSection = context ? `\n### Additional Context\n${context}\n` : '';

  return `## BountyPay: System Alert

**Severity:** ${severityLabel}  
**Error ID:** \`${errorId}\`  
**Type:** ${errorType}  
**Timestamp:** ${timestamp}

### Error Details
\`\`\`
${truncatedError}
\`\`\`

${infoSection}${contextSection}### Recommended Actions

- Review server logs for error ID \`${errorId}\`
- Check the <a href="${troubleshootingUrl}" target="_blank" rel="noopener noreferrer">troubleshooting guide</a>
- If this persists, open a support ticket with the error ID

---
${brandSignature}`;
}

