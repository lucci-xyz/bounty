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
  return `<h2>
  <sub><img src="${iconUrl}" alt="BountyPay" width="28" height="28" /></sub>
  Open Bounties (${bountyCount})
</h2>

@${username}, the following issues have active bounties:

${bountyList}

**How to claim a bounty:**

Reference the issue in your PR title or description (e.g., \`Fix #${exampleIssueNumber}\` or \`Closes #${exampleIssueNumber}\`). When your PR is merged, the bounty is paid automatically.

${brandSignature}`;
}

