/**
 * Comment posted when a new bounty is created on an issue.
 */
export function renderBountyCreatedComment({
  iconUrl,
  amountFormatted,
  tokenSymbol,
  networkName,
  deadlineDate,
  txUrl,
  linkWalletUrl,
  brandSignature
}) {
  return `## <img src="${iconUrl}" alt="BountyPay" width="20" height="20" /> Bounty: ${amountFormatted} ${tokenSymbol}

**Network:** ${networkName}  
**Deadline:** ${deadlineDate}  
**Transaction:** <a href="${txUrl}" target="_blank" rel="noopener noreferrer">View on Explorer</a>

Open a pull request that fixes this issue. When your PR is merged, payment is sent automatically.

New here? <a href="${linkWalletUrl}" target="_blank" rel="noopener noreferrer">Create an account and link your wallet</a> to receive payments.

${brandSignature}`;
}

