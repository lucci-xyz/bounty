/**
 * Comment posted when PR is merged but contributor has no wallet linked.
 */
export function renderWalletRequiredComment({
  iconUrl,
  username,
  linkWalletUrl,
  brandSignature
}) {
  return `<h2 style="display:flex;align-items:center;gap:8px;margin:0 0 12px;">
  <img src="${iconUrl}" alt="BountyPay" width="35" height="35" style="display:inline-block;" />
  <span>Bounty: Wallet Required</span>
</h2>

@${username}, your PR was merged and this bounty is ready to pay. However, we do not have a wallet address on file for you.

**To receive your payout:**

1. <a href="${linkWalletUrl}" target="_blank" rel="noopener noreferrer">Link your wallet</a>
2. After linking, comment on this issue and BountyPay will process your payment

${brandSignature}`;
}

