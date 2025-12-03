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
  return `<h2 style="display:flex;align-items:center;gap:8px;margin:0 0 12px;">
  <img src="${iconUrl}" alt="BountyPay" width="35" height="35" style="display:inline-block;" />
  <span>Bounty: ${amountFormatted} ${tokenSymbol}</span>
</h2>

**Network:** ${networkName}  
**Deadline:** ${deadlineDate}  
**Transaction:** <a href="${txUrl}" target="_blank" rel="noopener noreferrer">View on Explorer</a>

Open a pull request that fixes this issue. When your PR is merged, payment is sent automatically.

New here? <a href="${linkWalletUrl}" target="_blank" rel="noopener noreferrer">Create an account</a> to receive payments.

${brandSignature}`;
}

