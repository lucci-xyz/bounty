/**
 * Comment posted when a bounty is resolved and paid.
 */
export function renderBountyResolvedComment({
  iconUrl,
  username,
  amountFormatted,
  tokenSymbol,
  txUrl,
  brandSignature
}) {
  return `## <img src="${iconUrl}" alt="BountyPay" width="35" height="35" style="vertical-align: middle;" /> Bounty: Resolved

**Paid to:** @${username}  
**Amount:** ${amountFormatted} ${tokenSymbol}  
**Transaction:** <a href="${txUrl}" target="_blank" rel="noopener noreferrer">View on Explorer</a>

${brandSignature}`;
}

