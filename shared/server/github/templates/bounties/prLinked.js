import { getLinkHref } from '@/shared/config/links';

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
  return `<h2>
  <sub><img src="${iconUrl}" alt="BountyPay" width="28" height="28" /></sub>
  Bounty: Linked to PR
</h2>

**Issues:** ${issueLinks}  
**Value:** ${totalAmount} ${tokenSymbol}

Link your wallet to receive payment when this PR is merged:

<a href="${linkWalletUrl}" target="_blank" rel="noopener noreferrer">
  <img src="${LINK_WALLET_BADGE}" alt="Link Wallet" />
</a>

**Next steps:**

1. Link your wallet (takes about 30 seconds)
2. Get this PR merged
3. Payment is sent automatically

${brandSignature}`;
}

