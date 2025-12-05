import { renderCommentHeader, renderLink } from '../shared';

/**
 * Comment posted when a new bounty is created on an issue.
 */
export function renderBountyCreatedComment({
  iconUrl,
  amountFormatted,
  tokenSymbol,
  feeFormatted,
  totalFormatted,
  feePercent,
  networkName,
  deadlineDate,
  txUrl,
  linkWalletUrl,
  brandSignature
}) {
  const feeLine = feeFormatted ? `**Platform fee:** ${feeFormatted} ${tokenSymbol} (${feePercent ?? '1.00'}%)  
` : '';
  const totalLine = totalFormatted ? `**Total paid by sponsor:** ${totalFormatted} ${tokenSymbol}  
` : '';

  return `${renderCommentHeader({ iconUrl, title: `Bounty posted` })}

**Bounty (claimer receives):** ${amountFormatted} ${tokenSymbol}  
${feeLine}${totalLine}**Network:** ${networkName}  
**Deadline:** ${deadlineDate}  
**Transaction:** ${renderLink(txUrl, 'View on Explorer')}

Open a pull request that fixes this issue. When your PR is merged, payment is sent automatically.

New here? ${renderLink(linkWalletUrl, 'Create an account')} to receive payments.

${brandSignature}`;
}

