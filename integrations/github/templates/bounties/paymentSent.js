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

${brandSignature}`;
}

