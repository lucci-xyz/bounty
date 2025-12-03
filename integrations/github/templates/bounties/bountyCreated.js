import { renderCommentHeader, renderLink } from '../shared';

/**
 * Comment posted when a new bounty is created on an issue.
 */
export function renderBountyCreatedComment({
  iconUrl,
  amountFormatted,
  tokenSymbol,
  networkName,
  deadlineDate,
  txUrl,
  linkWalletUrl,
  brandSignature
}) {
  return `${renderCommentHeader({ iconUrl, title: `Bounty: ${amountFormatted} ${tokenSymbol}` })}

**Network:** ${networkName}  
**Deadline:** ${deadlineDate}  
**Transaction:** ${renderLink(txUrl, 'View on Explorer')}

Open a pull request that fixes this issue. When your PR is merged, payment is sent automatically.

New here? ${renderLink(linkWalletUrl, 'Create an account')} to receive payments.

${brandSignature}`;
}

