/**
 * Comment posted when a bounty is refunded to the sponsor.
 */
export function renderBountyRefundedComment({
  iconUrl,
  amountFormatted,
  tokenSymbol,
  networkName,
  txUrl,
  brandSignature
}) {
  return `<h2>
  <sub><img src="${iconUrl}" alt="BountyPay" width="28" height="28" /></sub>
  Bounty: Refunded
</h2>

**Amount:** ${amountFormatted} ${tokenSymbol}  
**Network:** ${networkName}  
**Transaction:** <a href="${txUrl}" target="_blank" rel="noopener noreferrer">View on Explorer</a>

This bounty has been refunded to the sponsor. The issue is no longer eligible for payment.

${brandSignature}`;
}

