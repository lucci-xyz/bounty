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
  return `## <img src="${iconUrl}" alt="BountyPay" width="20" height="20" /> Bounty: Refunded

**Amount:** ${amountFormatted} ${tokenSymbol}  
**Network:** ${networkName}  
**Transaction:** <a href="${txUrl}" target="_blank" rel="noopener noreferrer">View on Explorer</a>

This bounty has been refunded to the sponsor. The issue is no longer eligible for payment.

${brandSignature}`;
}

