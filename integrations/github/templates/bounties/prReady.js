import { renderCommentHeader } from '../shared';

/**
 * Comment posted on a PR when it links to a bounty issue and author has a wallet.
 */
export function renderPrReadyComment({
  iconUrl,
  issueLinks,
  totalAmount,
  tokenSymbol,
  walletDisplay,
  brandSignature
}) {
  return `${renderCommentHeader({ iconUrl, title: 'Bounty: Ready to Pay' })}

**Issues:** ${issueLinks}  
**Value (you receive):** ${totalAmount} ${tokenSymbol}  
**Recipient:** \`${walletDisplay}\`

When this PR is merged, payment will be sent automatically to your linked wallet.

${brandSignature}`;
}

