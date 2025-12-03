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
  return `<h2>
  <sub><img src="${iconUrl}" alt="BountyPay" width="28" height="28" /></sub>
  Bounty: ${amountFormatted} ${tokenSymbol}
</h2>

**Network:** ${networkName}  
**Deadline:** ${deadlineDate}  
**Transaction:** <a href="${txUrl}" target="_blank" rel="noopener noreferrer">View on Explorer</a>

Open a pull request that fixes this issue. When your PR is merged, payment is sent automatically.

New here? <a href="${linkWalletUrl}" target="_blank" rel="noopener noreferrer">Create an account</a> to receive payments.

${brandSignature}`;
}

