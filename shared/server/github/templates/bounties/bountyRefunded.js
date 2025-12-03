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
  return `<h2 style="display:flex;align-items:center;gap:8px;margin:0 0 12px;">
  <img src="${iconUrl}" alt="BountyPay" width="35" height="35" style="display:inline-block;" />
  <span>Bounty: Refunded</span>
</h2>

**Amount:** ${amountFormatted} ${tokenSymbol}  
**Network:** ${networkName}  
**Transaction:** <a href="${txUrl}" target="_blank" rel="noopener noreferrer">View on Explorer</a>

This bounty has been refunded to the sponsor. The issue is no longer eligible for payment.

${brandSignature}`;
}

