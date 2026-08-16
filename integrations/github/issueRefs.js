/**
 * Pure helpers for parsing GitHub issue references out of pull-request text.
 *
 * These functions decide WHICH bounty a pull request is claiming, so they sit
 * directly on the money path. They are intentionally dependency-free (no
 * octokit, no env config) so they can be unit tested in isolation.
 *
 * Two rules govern everything here:
 *
 * 1. Only a reference to an issue in THIS repository counts. A cross-repo
 *    reference (`vendor/lib#42`) names someone else's issue #42 and must never
 *    resolve to the local bounty on #42.
 * 2. A bare mention is not a claim. Only an explicit closing keyword expresses
 *    "this PR resolves that issue"; callers must not pay out on a mention.
 */

/**
 * Guard preventing a `#123` from matching when it is part of a larger token.
 *
 * Rejects a preceding word character, `/`, `#`, or `-`, which is what
 * distinguishes a local `#42` from `vendor/lib#42`, `v1.2#42`, or `##42`.
 */
const LOCAL_REF_PREFIX = '(?<![\\w/#-])';

/** GitHub's closing keywords, as a non-capturing alternation. */
const CLOSING_KEYWORDS = '(?:close[sd]?|fix(?:e[sd])?|resolve[sd]?)';

/**
 * Extract issue numbers a PR explicitly closes via GitHub's closing keywords
 * (close/closes/closed, fix/fixes/fixed, resolve/resolves/resolved).
 *
 * Cross-repository closing references (`Closes vendor/lib#42`) are deliberately
 * NOT returned: they close an issue in another repository, so they can never
 * justify paying a bounty held against a local issue of the same number.
 *
 * @param {string} prBody - The pull request body/description.
 * @returns {number[]} Issue numbers in the order they appear (may contain duplicates).
 */
export function extractClosedIssues(prBody) {
  if (!prBody) return [];

  // `[:\s]?\s*` allows the common "Closes: #12" form alongside "Closes #12".
  // The LOCAL_REF_PREFIX guard keeps `Closes vendor/lib#42` from matching.
  const regex = new RegExp(`${CLOSING_KEYWORDS}\\b:?\\s+${LOCAL_REF_PREFIX}#(\\d+)`, 'gi');
  const matches = [...prBody.matchAll(regex)];

  return matches.map((match) => parseInt(match[1], 10));
}

/**
 * Extract ALL issue numbers mentioned (#123) in a PR title or body.
 *
 * A mention is informational only — it is NOT evidence that the PR resolves the
 * issue. Never create a bounty claim or trigger a payout from this list; use
 * `extractClosedIssues` for that.
 *
 * @param {string} prTitle - The pull request title.
 * @param {string} [prBody] - The pull request body/description.
 * @returns {number[]} Unique issue numbers, in first-seen order.
 */
export function extractMentionedIssues(prTitle, prBody) {
  const text = `${prTitle ?? ''} ${prBody || ''}`;

  const regex = new RegExp(`${LOCAL_REF_PREFIX}#(\\d+)`, 'g');
  const matches = [...text.matchAll(regex)];

  // Return unique issue numbers
  return [...new Set(matches.map((match) => parseInt(match[1], 10)))];
}
