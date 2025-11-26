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
  return `## <img src="${iconUrl}" alt="BountyPay" width="20" height="20" /> Bounty: Paid

**Recipient:** @${username}  
**Amount:** ${amountFormatted} ${tokenSymbol}  
**Transaction:** <a href="${txUrl}" target="_blank" rel="noopener noreferrer">View on Explorer</a>

Payment sent successfully.

${brandSignature}`;
}

