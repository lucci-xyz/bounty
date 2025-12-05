import { renderCommentHeader, renderLink } from '../shared';

/**
 * Comment posted when a bounty is resolved and paid.
 */
export function renderBountyResolvedComment({
  iconUrl,
  username,
  amountFormatted,
  tokenSymbol,
  txUrl,
  brandSignature
}) {
  return `${renderCommentHeader({ iconUrl, title: 'Bounty: Resolved' })}

**Paid to:** @${username}  
**Amount:** ${amountFormatted} ${tokenSymbol}  
**Transaction:** ${renderLink(txUrl, 'View on Explorer')}

Platform fee was paid by the sponsor upfront; the contributor received the full bounty.

${brandSignature}`;
}

