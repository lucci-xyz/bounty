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
  return `<h2 style="display:flex;align-items:center;gap:8px;margin:0 0 12px;">
  <img src="${iconUrl}" alt="BountyPay" width="35" height="35" style="display:inline-block;" />
  <span>Bounty: Ready to Pay</span>
</h2>

**Issues:** ${issueLinks}  
**Value:** ${totalAmount} ${tokenSymbol}  
**Recipient:** \`${walletDisplay}\`

When this PR is merged, payment will be sent automatically to your linked wallet.

${brandSignature}`;
}

