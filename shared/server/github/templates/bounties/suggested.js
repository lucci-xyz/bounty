export function renderSuggestedBountiesComment({
  iconUrl,
  username,
  bountyCount,
  bountyList,
  exampleIssueNumber,
  brandSignature
}) {
  return `## <img src="${iconUrl}" alt="BountyPay Icon" width="20" height="20" /> Bounty: Available Issues

@${username}, there ${bountyCount === 1 ? 'is 1 open bounty' : `are ${bountyCount} open bounties`} in this repository:

${bountyList}

**To claim a bounty:**  
Edit your PR title or description to reference the issue number (e.g., "Fix #${exampleIssueNumber}" or "Closes #${exampleIssueNumber}").

The bounty will be automatically linked and paid when your PR is merged.

${brandSignature}`;
}

