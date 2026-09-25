import { renderCommentHeader, renderLink } from '../shared';

/**
 * Comment posted when PR is merged but contributor has no wallet linked.
 *
 * Linking the wallet is the whole action: the link endpoint settles the
 * contributor's waiting payouts itself. This used to ask them to "comment on
 * this issue" afterwards, but nothing listened for comments, so following the
 * instructions left the bounty unpaid.
 */
export function renderWalletRequiredComment({
  iconUrl,
  username,
  linkWalletUrl,
  payoutDeadline,
  brandSignature
}) {
  const deadlineNote = payoutDeadline
    ? `\n\nLink it before **${payoutDeadline}**. After that the payout window closes and the sponsor can reclaim the funds.`
    : '';

  return `${renderCommentHeader({ iconUrl, title: 'Bounty: Wallet Required' })}

@${username}, your PR was merged and this bounty is ready to pay. However, we do not have a wallet address on file for you.

**To receive your payout:** ${renderLink(linkWalletUrl, 'Link your wallet')}. BountyPay sends the payment as soon as it is linked; there is nothing else to do.${deadlineNote}

${brandSignature}`;
}
