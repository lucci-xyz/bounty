import { renderCommentHeader } from '../shared';

/**
 * Comment listing open bounties when a contributor opens a PR.
 */
export function renderOpenBountiesComment({
  iconUrl,
  username,
  bountyCount,
  bountyList,
  exampleIssueNumber,
  brandSignature
}) {
  return `${renderCommentHeader({ iconUrl, title: `Open Bounties (${bountyCount})` })}

@${username}, the following issues have active bounties:

${bountyList}

**How to claim a bounty:**

Reference the issue in your PR title or description (e.g., \`Fix #${exampleIssueNumber}\` or \`Closes #${exampleIssueNumber}\`). When your PR is merged, the bounty is paid automatically.

${brandSignature}`;
}

