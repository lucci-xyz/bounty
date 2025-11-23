export function renderMaintainerAlertComment({
  emoji,
  severityBadge,
  errorIdBadge,
  errorType,
  timestamp,
  truncatedError,
  detailsSection,
  context,
  troubleshootingUrl,
  errorId,
  brandSignature
}) {
  const infoSection = detailsSection ? `### System Information\n${detailsSection}\n` : '';
  const contextSection = context ? `\n### Additional Context\n${context}\n` : '';

  return `## ${emoji} BountyPay System Alert

${severityBadge}  
${errorIdBadge}

**Issue Type:** ${errorType}  
**Timestamp:** ${timestamp}

### Error Details
\`\`\`
${truncatedError}
\`\`\`

${infoSection}${contextSection}### Recommended Actions
- Review server logs for error ID \`${errorId}\`
- Check the <a href="${troubleshootingUrl}" target="_blank" rel="noopener noreferrer">troubleshooting guide</a>
- If this persists, please open a support ticket with the error ID

---
${brandSignature}`;
}

