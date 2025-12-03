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
  return `<h2>
  <sub><img src="${iconUrl}" alt="BountyPay" width="28" height="28" /></sub>
  Bounty: Ready to Pay
</h2>

**Issues:** ${issueLinks}  
**Value:** ${totalAmount} ${tokenSymbol}  
**Recipient:** \`${walletDisplay}\`

When this PR is merged, payment will be sent automatically to your linked wallet.

${brandSignature}`;
}

