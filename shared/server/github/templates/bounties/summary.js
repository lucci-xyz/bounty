export function renderBountySummaryComment({
  iconUrl,
  amountFormatted,
  tokenSymbol,
  networkName,
  deadlineDate,
  txUrl,
  txDisplay,
  issueNumber,
  linkWalletUrl,
  brandSignature
}) {
  return `## <img src="${iconUrl}" alt="BountyPay Icon" width="20" height="20" /> Bounty: ${amountFormatted} ${tokenSymbol} on ${networkName}

**Deadline:** ${deadlineDate}  
**Status:** Open  
**Tx:** <a href="${txUrl}" target="_blank" rel="noopener noreferrer">\`${txDisplay}\`</a>

### To Claim:
1. Open a PR that fixes this issue (mention #${issueNumber} anywhere in title or description)
2. <a href="${linkWalletUrl}" target="_blank" rel="noopener noreferrer">Link your wallet</a> to receive payment
3. Merge your PR and receive ${amountFormatted} ${tokenSymbol} automatically

${brandSignature}`;
}

