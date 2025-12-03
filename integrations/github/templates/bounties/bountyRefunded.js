import { renderCommentHeader, renderLink } from '../shared';

/**
 * Comment posted when a bounty is refunded to the sponsor.
 */
export function renderBountyRefundedComment({
  iconUrl,
  amountFormatted,
  tokenSymbol,
  networkName,
  txUrl,
  brandSignature
}) {
  return `${renderCommentHeader({ iconUrl, title: 'Bounty: Refunded' })}

**Amount:** ${amountFormatted} ${tokenSymbol}  
**Network:** ${networkName}  
**Transaction:** ${renderLink(txUrl, 'View on Explorer')}

This bounty has been refunded to the sponsor. The issue is no longer eligible for payment.

${brandSignature}`;
}

