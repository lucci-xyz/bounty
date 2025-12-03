/**
 * Shared header component for BountyPay GitHub issue/PR comments.
 * Provides consistent branding across all comment types.
 */

/**
 * Renders the standard BountyPay comment header.
 * @param {Object} options
 * @param {string} options.iconUrl - URL to BountyPay icon
 * @param {string} options.title - Title text (e.g., "Bounty: Paid", "Bounty: 500 USDC")
 * @returns {string} Markdown/HTML header
 */
export function renderCommentHeader({ iconUrl, title }) {
  return `<h2>
  <sub><img src="${iconUrl}" alt="BountyPay" width="28" height="28" /></sub>
  ${title}
</h2>`;
}

/**
 * Renders a key-value line for bounty details.
 * @param {string} label - Label text (e.g., "Network", "Deadline")
 * @param {string} value - Value text
 * @returns {string} Markdown formatted line
 */
export function renderDetailLine(label, value) {
  return `**${label}:** ${value}`;
}

/**
 * Renders a link with optional target blank.
 * @param {string} url - Link URL
 * @param {string} text - Link text
 * @param {boolean} [newTab=true] - Whether to open in new tab
 * @returns {string} HTML anchor tag
 */
export function renderLink(url, text, newTab = true) {
  const attrs = newTab ? 'target="_blank" rel="noopener noreferrer"' : '';
  return `<a href="${url}" ${attrs}>${text}</a>`;
}

