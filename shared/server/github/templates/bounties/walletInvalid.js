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
  return `<h2 style="display:flex;align-items:center;gap:8px;margin:0 0 12px;">
  <img src="${iconUrl}" alt="BountyPay" width="35" height="35" style="display:inline-block;" />
  <span>Bounty: Invalid Wallet</span>
</h2>

@${username}, we could not send this bounty because the wallet address on file is invalid.

**Current address:** \`${invalidAddress}\`

**To fix this:**

1. <a href="${linkWalletUrl}" target="_blank" rel="noopener noreferrer">Update your wallet</a> with a valid EVM address
2. Once updated, you will be eligible to receive payment on the next payout attempt

${brandSignature}`;
}

