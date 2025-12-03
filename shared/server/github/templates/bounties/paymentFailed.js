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
  return `## <img src="${iconUrl}" alt="BountyPay" width="35" height="35" style="vertical-align: middle;" /> Bounty: Payment Issue

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

