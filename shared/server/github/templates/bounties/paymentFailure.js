export function renderPaymentFailureComment({
  iconUrl,
  errorSnippet,
  helpText,
  network,
  recipientAddress,
  brandSignature
}) {
  return `## <img src="${iconUrl}" alt="BountyPay Icon" width="20" height="20" /> Bounty: Payment Failed

**Status:** ❌ Transaction error  
**Error:** \`${errorSnippet}\`

**What happened:**  
${helpText}

**Network:** ${network || 'UNKNOWN'}  
**Recipient:** \`${recipientAddress}\`

${brandSignature}`;
}

