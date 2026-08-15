/**
 * Human-readable messages for BountyEscrow failures.
 *
 * Every custom error in contracts/current/BountyEscrow.sol gets a sentence that
 * says what happened and what to do about it. Without this, an ethers rejection
 * reaches the user as its raw message — typically
 * `execution reverted (unknown custom error) (action="estimateGas", data="0x…")`
 * — which is the worst possible thing to show someone who is trying to move
 * their own money.
 *
 * This logic previously existed only inside the funding flow, so the paths
 * where a user recovers funds showed the raw text.
 */

/**
 * Custom error selectors, mapped to what they mean for the person reading.
 *
 * Keys are matched against the error text, so both a decoded name
 * (`NotSponsor`) and an encoded revert string containing it will hit.
 */
const CONTRACT_ERROR_MESSAGES = {
  AlreadyExists:
    'A bounty already exists for this issue from your wallet. The escrow keeps one bounty per issue per sponsor, so this issue cannot be funded again from this address.',
  NotOpen:
    'This bounty is no longer open — it has already been paid out or refunded.',
  NotSponsor:
    'Only the wallet that funded this bounty can refund it. Connect the funding wallet and try again.',
  NotResolver:
    'Only BountyPay can release this payout. If a merged pull request should have paid it, contact support.',
  DeadlineNotReached:
    'This bounty has not expired yet. A bounty can only be refunded after its deadline has passed.',
  DeadlinePassed:
    'This bounty has passed its deadline and can no longer be paid out. The sponsor can now refund it.',
  TokenNotAllowed:
    'This token is not accepted for bounties on this network.',
  ZeroAddress: 'An invalid address was provided.',
  ZeroAmount: 'The amount must be greater than zero.',
  InsufficientFees: 'The requested amount is more than the fees available to withdraw.',
  NoFeesAvailable: 'There are no fees available to withdraw for this token.',
  InvalidParams: 'Invalid parameters — check the deadline and amount.'
};

/**
 * Turn a wallet or contract error into something worth showing a user.
 *
 * @param {unknown} error Error thrown by ethers, wagmi, or a fetch wrapper.
 * @param {string} [fallback] Message when nothing more specific is known.
 * @returns {string} A complete, human-readable sentence.
 */
export function mapContractError(error, fallback = 'Something went wrong with the transaction. Please try again.') {
  if (!error) return fallback;

  // The user declining in their wallet is not a failure worth alarming them about.
  if (error.code === 'ACTION_REJECTED' || error.code === 4001) {
    return 'Transaction was rejected in your wallet.';
  }

  const haystack = [error.reason, error.shortMessage, error.message, error.data?.message]
    .filter(Boolean)
    .join(' ');

  if (!haystack) return fallback;

  for (const [name, message] of Object.entries(CONTRACT_ERROR_MESSAGES)) {
    if (haystack.includes(name)) return message;
  }

  if (/insufficient funds/i.test(haystack)) {
    return 'Not enough native currency in your wallet to cover gas fees.';
  }
  if (/user rejected|user denied/i.test(haystack)) {
    return 'Transaction was rejected in your wallet.';
  }
  if (/nonce/i.test(haystack)) {
    return 'Your wallet is out of sync with the network. Reset the account in your wallet and try again.';
  }
  if (/missing revert data/i.test(haystack)) {
    return 'The transaction could not be simulated. The contract may be unavailable on this network, or the parameters may be invalid.';
  }
  if (/execution reverted/i.test(haystack)) {
    return 'The contract rejected this transaction. Check that you are on the right network with the right wallet.';
  }

  // A `reason` from ethers is already a short human string; anything else is
  // internal detail and must not be dumped on the user.
  if (error.reason && error.reason.length < 120) return error.reason;

  return fallback;
}

export { CONTRACT_ERROR_MESSAGES };
