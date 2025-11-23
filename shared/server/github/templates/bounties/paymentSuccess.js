export function renderPaymentSuccessComment({
  iconUrl,
  username,
  amountFormatted,
  tokenSymbol,
  explorerTxUrl,
  brandSignature
}) {
  return `## <img src="${iconUrl}" alt="BountyPay Icon" width="20" height="20" /> Bounty: Paid

**Recipient:** @${username}  
**Amount:** ${amountFormatted} ${tokenSymbol}  
**Transaction:** <a href="${explorerTxUrl}" target="_blank" rel="noopener noreferrer">View on Explorer</a>

Payment has been sent successfully.

${brandSignature}`;
}

