/**
 * Pure helpers for parsing GitHub issue references out of pull-request text.
 *
 * These functions decide WHICH bounty a pull request is claiming, so they sit
 * directly on the money path. They are intentionally dependency-free (no
 * octokit, no env config) so they can be unit tested in isolation.
 */

/**
 * Extract issue numbers a PR explicitly closes via GitHub's closing keywords
 * (close/closes/closed, fix/fixes/fixed, resolve/resolves/resolved).
 *
 * @param {string} prBody - The pull request body/description.
 * @returns {number[]} Issue numbers in the order they appear (may contain duplicates).
 */
export function extractClosedIssues(prBody) {
  if (!prBody) return [];

  // Match variations: Closes #123, Fixes #456, Resolves #789
  const regex = /(?:close[sd]?|fix(?:e[sd])?|resolve[sd]?)\s+#(\d+)/gi;
  const matches = [...prBody.matchAll(regex)];

  return matches.map((match) => parseInt(match[1], 10));
}

/**
 * Extract ALL issue numbers mentioned (#123) in a PR title or body.
 *
 * @param {string} prTitle - The pull request title.
 * @param {string} [prBody] - The pull request body/description.
 * @returns {number[]} Unique issue numbers, in first-seen order.
 */
export function extractMentionedIssues(prTitle, prBody) {
  const text = `${prTitle ?? ''} ${prBody || ''}`;

  // Match any #123 pattern
  const regex = /#(\d+)/g;
  const matches = [...text.matchAll(regex)];

  // Return unique issue numbers
  return [...new Set(matches.map((match) => parseInt(match[1], 10)))];
}
