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
  return `## <img src="${iconUrl}" alt="BountyPay" width="20" height="20" /> Bounty: Invalid Wallet

@${username}, we could not send this bounty because the wallet address on file is invalid.

**Current address:** \`${invalidAddress}\`

**To fix this:**

1. <a href="${linkWalletUrl}" target="_blank" rel="noopener noreferrer">Update your wallet</a> with a valid EVM address
2. Once updated, you will be eligible to receive payment on the next payout attempt

${brandSignature}`;
}

