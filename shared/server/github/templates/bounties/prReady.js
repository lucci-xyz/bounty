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
  return `## <img src="${iconUrl}" alt="BountyPay" width="20" height="20" /> Bounty: Ready to Pay

**Issues:** ${issueLinks}  
**Value:** ${totalAmount} ${tokenSymbol}  
**Recipient:** \`${walletDisplay}\`

When this PR is merged, payment will be sent automatically to your linked wallet.

${brandSignature}`;
}

