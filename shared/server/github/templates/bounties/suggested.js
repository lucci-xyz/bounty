export function renderSuggestedBountiesComment({
  iconUrl,
  username,
  bountyCount,
  bountyList,
  exampleIssueNumber,
  brandSignature
}) {
  return `## <img src="${iconUrl}" alt="BountyPay Icon" width="20" height="20" /> Bounty: Open Issues (${bountyCount})

@${username}, these issues currently have bounties:

${bountyList}

**Claim a bounty**

Include the issue in your PR title or description  
(e.g. \`Fix #${exampleIssueNumber}\` or \`Closes #${exampleIssueNumber}\`).  
When your PR is merged, the bounty is paid automatically.

${brandSignature}`;
}