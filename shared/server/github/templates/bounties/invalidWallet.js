export function renderInvalidWalletComment({
  iconUrl,
  prUrl,
  username,
  invalidAddress,
  brandSignature
}) {
  return `## <img src="${iconUrl}" alt="BountyPay Icon" width="20" height="20" /> Bounty: Wallet Issue

@${username}, we could not send this bounty because the wallet address on file (\`${invalidAddress}\`) is invalid.

**How to fix**

1. <a href="${prUrl}" target="_blank" rel="noopener noreferrer">Update your wallet</a> with a valid EVM address.  
2. Once updated, you will be eligible to receive payment on the next payout attempt.

${brandSignature}`;
}