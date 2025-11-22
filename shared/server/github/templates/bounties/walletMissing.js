export function renderWalletMissingAfterMergeComment({ iconUrl, prUrl, username, brandSignature }) {
  return `## <img src="${iconUrl}" alt="BountyPay Icon" width="20" height="20" /> Bounty: Wallet Missing

**Status:** ⏸️ Payment paused  
@${username}, your PR was merged but we can't send the payment without a wallet address.

**What to do:**  
1. <a href="${prUrl}" target="_blank" rel="noopener noreferrer">Link your wallet here</a>  
2. After linking, comment on this PR to trigger a manual payout

${brandSignature}`;
}

