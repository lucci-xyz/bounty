import { getLinkHref } from '@/shared/config/links';

const LINK_WALLET_BADGE = getLinkHref('assets', 'badgeLinkWallet');

export function renderLinkWalletPromptComment({
  iconUrl,
  issueLinks,
  totalAmount,
  tokenSymbol,
  prUrl,
  brandSignature
}) {
  return `## <img src="${iconUrl}" alt="BountyPay Icon" width="20" height="20" /> Bounty: Linked to PR

**Claim:** ${issueLinks}  
**Value:** ${totalAmount} ${tokenSymbol}  
**Status:** Wallet required

<a href="${prUrl}" target="_blank" rel="noopener noreferrer">
  <img src="${LINK_WALLET_BADGE}" alt="Link Wallet" />
</a>

**Next steps:**  
1. Link your wallet (free, takes 30 seconds)  
2. Merge this PR  
3. Payment sent automatically

${brandSignature}`;
}

