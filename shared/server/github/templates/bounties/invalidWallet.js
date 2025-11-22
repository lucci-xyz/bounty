export function renderInvalidWalletComment({ iconUrl, prUrl, username, invalidAddress, brandSignature }) {
  return `## <img src="${iconUrl}" alt="BountyPay Icon" width="20" height="20" /> Bounty: Invalid Wallet

**Status:** ❌ Payment failed  
@${username}, the wallet address on file (\`${invalidAddress}\`) is invalid.

**What to do:**  
1. <a href="${prUrl}" target="_blank" rel="noopener noreferrer">Re-link your wallet</a> with a valid Ethereum address  
2. Contact support if this keeps happening

${brandSignature}`;
}

