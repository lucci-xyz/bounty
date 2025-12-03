import { renderCommentHeader, renderLink } from '../shared';

/**
 * Comment posted when a contributor's wallet address is invalid.
 */
export function renderWalletInvalidComment({
  iconUrl,
  username,
  invalidAddress,
  linkWalletUrl,
  brandSignature
}) {
  return `${renderCommentHeader({ iconUrl, title: 'Bounty: Invalid Wallet' })}

@${username}, we could not send this bounty because the wallet address on file is invalid.

**Current address:** \`${invalidAddress}\`

**To fix this:**

1. ${renderLink(linkWalletUrl, 'Update your wallet')} with a valid EVM address
2. Once updated, you will be eligible to receive payment on the next payout attempt

${brandSignature}`;
}

