import { CONFIG } from '../../config.js';

const BADGE_BASE = 'https://img.shields.io/badge';
const BADGE_LABEL_COLOR = '111827';
const BADGE_STYLE = 'for-the-badge';
const FRONTEND_BASE = CONFIG.frontendUrl.replace(/\/$/, '');
export const CTA_BUTTON = `${FRONTEND_BASE}/buttons/create-bounty.svg`;
export const OG_ICON = `${FRONTEND_BASE}/icons/og.png`;
export const BRAND_SIGNATURE = `> _By <a href="${FRONTEND_BASE}" target="_blank" rel="noopener noreferrer">BountyPay</a> <img src="${OG_ICON}" alt="BountyPay Icon" width="18" height="18" />_`;

/**
 * Encodes badge segment for safe URL usage
 */
const encodeBadgeSegment = (text) => encodeURIComponent(text).replace(/-/g, '--');

/**
 * Creates a badge image markdown
 * @param {string} label - Badge label
 * @param {string} value - Badge value
 * @param {string} color - Badge color hex (without #)
 * @param {string} extraQuery - Additional URL query params
 * @returns {string} Markdown image string
 */
export function badge(label, value, color = '0B9ED9', extraQuery = '') {
  const labelEncoded = encodeBadgeSegment(label);
  const valueEncoded = encodeBadgeSegment(value);
  const query = `style=${BADGE_STYLE}&labelColor=${BADGE_LABEL_COLOR}${extraQuery ? `&${extraQuery}` : ''}`;
  return `![${label} ${value}](${BADGE_BASE}/${labelEncoded}-${valueEncoded}-${color}?${query})`;
}

/**
 * Creates a clickable badge link
 */
export function badgeLink(label, value, color, href, extraQuery = '') {
  return `[${badge(label, value, color, extraQuery)}](${href})`;
}

/**
 * Returns network metadata for display
 */
export function networkMeta(networkKey) {
  if (networkKey === 'MEZO_TESTNET') {
    return {
      name: 'Mezo Testnet',
      explorerTx: (hash) => `https://explorer.test.mezo.org/tx/${hash}`,
    };
  }
  return {
    name: 'Base Sepolia',
    explorerTx: (hash) => `https://sepolia.basescan.org/tx/${hash}`,
  };
}

/**
 * Notifies repository maintainers about system errors
 * @param {Object} octokit - GitHub API client
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 * @param {number} issueNumber - Issue number to post comment on
 * @param {Object} errorDetails - Error information
 * @returns {Promise<string|null>} Error ID or null if notification failed
 */
export async function notifyMaintainers(octokit, owner, repo, issueNumber, errorDetails) {
  const {
    errorType,
    errorMessage,
    severity = 'high',
    bountyId,
    network,
    recipientAddress,
    prNumber,
    username,
    txHash,
    context
  } = errorDetails;

  const timestamp = new Date().toISOString();
  const errorId = `ERR-${Date.now().toString(36).toUpperCase()}`;
  
  const severityConfig = {
    critical: { emoji: '🔴', label: 'CRITICAL', color: 'DC2626' },
    high: { emoji: '🟠', label: 'HIGH', color: 'EA580C' },
    medium: { emoji: '🟡', label: 'MEDIUM', color: 'CA8A04' },
    low: { emoji: '🔵', label: 'LOW', color: '2563EB' }
  };
  
  const config = severityConfig[severity] || severityConfig.high;
  
  let detailsSection = '';
  if (bountyId) detailsSection += `\n- **Bounty ID:** \`${bountyId}\``;
  if (network) detailsSection += `\n- **Network:** ${network}`;
  if (recipientAddress) detailsSection += `\n- **Recipient:** \`${recipientAddress.slice(0, 10)}...${recipientAddress.slice(-8)}\``;
  if (prNumber) detailsSection += `\n- **PR:** #${prNumber}`;
  if (username) detailsSection += `\n- **User:** @${username}`;
  if (txHash) detailsSection += `\n- **Transaction:** \`${txHash}\``;
  
  const truncatedError = errorMessage.length > 300 
    ? errorMessage.substring(0, 300) + '...' 
    : errorMessage;
  
  const comment = `## ${config.emoji} BountyPay System Alert

${badge('Severity', config.label, config.color)}  
${badge('Error ID', errorId, '6B7280')}

**Issue Type:** ${errorType}  
**Timestamp:** ${timestamp}

### Error Details
\`\`\`
${truncatedError}
\`\`\`

### System Information
${detailsSection}
${context ? `\n### Additional Context\n${context}` : ''}

### Recommended Actions
- Review server logs for error ID \`${errorId}\`
- Check the <a href="${FRONTEND_BASE}/docs/support/troubleshooting" target="_blank" rel="noopener noreferrer">troubleshooting guide</a>
- If this persists, please open a support ticket with the error ID

---
*This is an automated system notification. The BountyPay team has been alerted.*`;

  try {
    const { postIssueComment } = await import('../client.js');
    await postIssueComment(octokit, owner, repo, issueNumber, comment);
    console.log(`Maintainer notification posted: ${errorId}`);
    return errorId;
  } catch (notifyError) {
    console.error('Failed to notify maintainers:', notifyError.message);
    return null;
  }
}

