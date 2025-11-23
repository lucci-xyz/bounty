export function renderWalletMissingAfterMergeComment({
  iconUrl,
  prUrl,
  username,
  brandSignature
}) {
  return `## <img src="${iconUrl}" alt="BountyPay Icon" width="20" height="20" /> Bounty: Wallet Needed

@${username}, your PR was merged and this bounty is ready to pay, but we don't have a wallet address for you yet.

**To receive your payout**

1. <a href="${prUrl}" target="_blank" rel="noopener noreferrer">Link your wallet</a>.  
2. After linking, comment on this PR and BountyPay will retry the payment.

${brandSignature}`;
}