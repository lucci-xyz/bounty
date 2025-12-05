import { renderCommentHeader, renderLink } from '../shared';

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
  return `${renderCommentHeader({ iconUrl, title: 'Bounty: Paid' })}

**Recipient:** @${username}  
**Amount:** ${amountFormatted} ${tokenSymbol}  
**Transaction:** ${renderLink(txUrl, 'View on Explorer')}

Payment sent successfully. Platform fee was paid by the sponsor upfront; the recipient receives the full bounty.

${brandSignature}`;
}

