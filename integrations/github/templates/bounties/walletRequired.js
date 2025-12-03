import { renderCommentHeader, renderLink } from '../shared';

/**
 * Comment posted when PR is merged but contributor has no wallet linked.
 */
export function renderWalletRequiredComment({
  iconUrl,
  username,
  linkWalletUrl,
  brandSignature
}) {
  return `${renderCommentHeader({ iconUrl, title: 'Bounty: Wallet Required' })}

@${username}, your PR was merged and this bounty is ready to pay. However, we do not have a wallet address on file for you.

**To receive your payout:**

1. ${renderLink(linkWalletUrl, 'Link your wallet')}
2. After linking, comment on this issue and BountyPay will process your payment

${brandSignature}`;
}

