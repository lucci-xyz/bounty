/**
 * Comment posted when payment fails.
 */
export function renderPaymentFailedComment({
  iconUrl,
  errorSnippet,
  helpText,
  network,
  recipientAddress,
  brandSignature
}) {
  return `<h2 style="display:flex;align-items:center;gap:8px;margin:0 0 12px;">
  <img src="${iconUrl}" alt="BountyPay" width="35" height="35" style="display:inline-block;" />
  <span>Bounty: Payment Issue</span>
</h2>

Your payout could not be processed. Our team has been notified and is looking into it.

You do not need to take any action. We will retry or post an update here once it is resolved.

<details>
<summary>Technical details</summary>

**Error:** \`${errorSnippet}\`  
${helpText}

**Network:** ${network || 'Unknown'}  
**Recipient:** \`${recipientAddress}\`
</details>

${brandSignature}`;
}

