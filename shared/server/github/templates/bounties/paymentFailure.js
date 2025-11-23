export function renderPaymentFailureComment({
  iconUrl,
  errorSnippet,
  helpText,
  network,
  recipientAddress,
  brandSignature
}) {
  return `## <img src="${iconUrl}" alt="BountyPay Icon" width="20" height="20" /> Bounty: Payment Issue

Your payout didn’t go through, but our team has been notified and is looking into it.

You don’t need to do anything right now — we’ll retry or post an update here once it’s resolved.

<details>
<summary>Technical details (for maintainers)</summary>

**Error:** \`${errorSnippet}\`  

${helpText}

**Network:** ${network || 'UNKNOWN'}  
**Recipient:** \`${recipientAddress}\`
</details>

${brandSignature}`;
}