/**
 * Comment posted when payment is successfully sent.
 */
export function renderPaymentSentComment({
  iconUrl,
  username,
  amountFormatted,
  tokenSymbol,
  txUrl,
  brandSignature
}) {
  return `<h2 style="display:flex;align-items:center;gap:8px;margin:0 0 12px;">
  <img src="${iconUrl}" alt="BountyPay" width="35" height="35" style="display:inline-block;" />
  <span>Bounty: Paid</span>
</h2>

**Recipient:** @${username}  
**Amount:** ${amountFormatted} ${tokenSymbol}  
**Transaction:** <a href="${txUrl}" target="_blank" rel="noopener noreferrer">View on Explorer</a>

Payment sent successfully.

${brandSignature}`;
}

