import { renderCommentHeader } from '../shared';

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
  return `${renderCommentHeader({ iconUrl, title: 'Bounty: Payment Issue' })}

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

