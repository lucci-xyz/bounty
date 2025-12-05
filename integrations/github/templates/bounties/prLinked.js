import { getLinkHref } from '@/config/links';
import { renderCommentHeader, renderLink } from '../shared';

const LINK_WALLET_BADGE = getLinkHref('assets', 'badgeLinkWallet');

/**
 * Comment posted on a PR when it links to a bounty issue but author has no wallet.
 */
export function renderPrLinkedComment({
  iconUrl,
  issueLinks,
  totalAmount,
  tokenSymbol,
  linkWalletUrl,
  brandSignature
}) {
  return `${renderCommentHeader({ iconUrl, title: 'Bounty: Linked to PR' })}

**Issues:** ${issueLinks}  
**Value (you receive):** ${totalAmount} ${tokenSymbol}

Link your wallet to receive payment when this PR is merged:

${renderLink(linkWalletUrl, `<img src="${LINK_WALLET_BADGE}" alt="Link Wallet" />`)}

**Next steps:**

1. Link your wallet (takes about 30 seconds)
2. Get this PR merged
3. Payment is sent automatically

${brandSignature}`;
}

