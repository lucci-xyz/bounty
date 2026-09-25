/**
 * The one path by which a PR claim turns into an on-chain payout.
 *
 * Three callers settle claims: the merge webhook, the contributor's manual
 * retry, and wallet linking. Each used to carry its own copy of the gates, and
 * the copies drifted: the retry endpoint skipped the address check, and none of
 * them could pay a `pending_wallet` claim, so a contributor whose PR merged
 * before they linked a wallet was never paid.
 *
 * Everything with side effects arrives through `deps`, so the rules below are
 * unit tested against an in-memory world. `server/payouts/index.js` wires the
 * real database and chain.
 *
 * No claim is paid without `mergeVerifiedAt`, which only the merge webhook
 * writes, after checking that the merged PR closes the bountied issue. Status
 * alone is not proof: before that gate existed, the webhook wrote
 * `pending_wallet` and `failed` for any claim on a merged PR, including claims
 * recorded from a bare mention or a forged webhook.
 *
 * The caller is responsible for checking that the claim belongs to whoever is
 * asking (session or webhook).
 */

import { CLAIM_STATUS, SETTLEABLE_CLAIM_STATUSES, isPaidClaim } from '../../lib/claimStatus.js';

/**
 * Mirrors `BountyEscrow.RESOLVE_GRACE`: `resolve` is accepted while
 * `block.timestamp <= deadline + RESOLVE_GRACE`.
 */
export const RESOLVE_GRACE_SECONDS = 24 * 60 * 60;

/**
 * How far past the window a refusal must be before it is reported as the window
 * closing rather than as a chain failure. Our clock may run ahead of the chain.
 */
export const CLOCK_SKEW_SECONDS = 5 * 60;

export const SETTLEMENT = {
  /** Funds transferred. */
  PAID: 'paid',
  /** No wallet linked; claim parked as `pending_wallet`. */
  NEEDS_WALLET: 'needs_wallet',
  /** Stored wallet is not a valid address; claim failed. */
  INVALID_WALLET: 'invalid_wallet',
  /** Sponsor's allowlist excludes the recipient; claim failed. */
  NOT_ALLOWLISTED: 'not_allowlisted',
  /** The contract refused, and the database deadline + grace has passed. Claim failed. */
  WINDOW_CLOSED: 'window_closed',
  /** Bounty has no network alias; nothing attempted. Claim failed, retryable once fixed. */
  NO_NETWORK: 'no_network',
  /** The transaction did not succeed; claim failed. `error` is raw: never publish it. */
  CHAIN_FAILED: 'chain_failed',
  /** Nothing attempted and the claim left unchanged. See `reason`. */
  SKIPPED: 'skipped',
  /** Settlement threw before reaching a decision (batch callers only). */
  ERROR: 'error',
  /** Not started: the batch ran out of time (batch callers only). Claim unchanged. */
  DEFERRED: 'deferred'
};

/**
 * @typedef {object} SettlementDeps
 * @property {string} environment Deployment target; bounties from others are never touched.
 * @property {() => number} now Current time in milliseconds.
 * @property {(address: string) => boolean} isAddress
 * @property {(bountyId: string) => Promise<object|null>} findBounty
 * @property {(githubId: number) => Promise<{walletAddress: string}|null>} findWallet
 * @property {(bountyId: string, address: string) => Promise<{allowed: boolean}>} checkAllowed
 * @property {(bountyId: string, address: string, network: string) => Promise<{success: boolean, txHash?: string, error?: string}>} resolveOnChain
 * @property {(claimId: number, status: string, details?: {txHash?: string, resolvedAt?: number}) => Promise<unknown>} markClaim
 * @property {(bountyId: string, txHash: string) => Promise<unknown>} markBountyResolved
 * @property {(githubId: number) => Promise<object[]>} [findClaimsByContributor] Required by settleContributorClaims.
 */

/**
 * Settle one claim: decide whether it can be paid, pay it, and record the result.
 *
 * @param {object} claim `{ id, bountyId, prAuthorGithubId, status, mergeVerifiedAt }`
 * @param {SettlementDeps} deps
 * @param {object} [options]
 * @param {Iterable<string>} [options.payableStatuses] Claim statuses this caller
 *   may settle from. Defaults to the contributor-settleable set, which excludes
 *   `pending`. A paid claim is refused regardless.
 * @returns {Promise<{outcome: string, reason?: string, bounty?: object, recipient?: string,
 *   txHash?: string, error?: string, closedAt?: number, recordError?: Error}>}
 */
export async function settleClaim(claim, deps, { payableStatuses = SETTLEABLE_CLAIM_STATUSES } = {}) {
  if (!claim) return skipped('claim_missing');

  const payable = new Set(payableStatuses);
  if (isPaidClaim(claim.status) || !payable.has(claim.status)) {
    return skipped('claim_not_payable');
  }
  if (!claim.mergeVerifiedAt) return skipped('merge_unverified');

  const bounty = await deps.findBounty(claim.bountyId);
  if (!bounty) return skipped('bounty_missing');
  if (bounty.environment && bounty.environment !== deps.environment) {
    return skipped('wrong_environment', bounty);
  }
  if (bounty.status !== 'open') return skipped('bounty_not_open', bounty);
  if (!bounty.network) {
    await deps.markClaim(claim.id, CLAIM_STATUS.FAILED);
    return { outcome: SETTLEMENT.NO_NETWORK, bounty };
  }

  const wallet = await deps.findWallet(claim.prAuthorGithubId);
  if (!wallet?.walletAddress) {
    await deps.markClaim(claim.id, CLAIM_STATUS.PENDING_WALLET);
    return { outcome: SETTLEMENT.NEEDS_WALLET, bounty };
  }

  const recipient = wallet.walletAddress;
  if (!deps.isAddress(recipient)) {
    await deps.markClaim(claim.id, CLAIM_STATUS.FAILED);
    return { outcome: SETTLEMENT.INVALID_WALLET, bounty, recipient };
  }

  const allowlist = await deps.checkAllowed(bounty.bountyId, recipient);
  if (!allowlist?.allowed) {
    await deps.markClaim(claim.id, CLAIM_STATUS.FAILED);
    return { outcome: SETTLEMENT.NOT_ALLOWLISTED, bounty, recipient };
  }

  let result;
  try {
    result = await deps.resolveOnChain(bounty.bountyId, recipient, bounty.network);
  } catch (error) {
    result = { success: false, error: error?.message || 'Unknown error during resolution' };
  }

  if (!result?.success || !result.txHash) {
    await deps.markClaim(claim.id, CLAIM_STATUS.FAILED);

    // The contract alone decides whether it is too late; the database deadline
    // only explains a refusal. Before creation read the deadline from the chain,
    // the stored one came from the request body and may be earlier.
    const closedAt = settlementWindowClosesAt(bounty);
    const nowSeconds = Math.floor(deps.now() / 1000);
    if (closedAt !== null && nowSeconds > closedAt + CLOCK_SKEW_SECONDS) {
      return { outcome: SETTLEMENT.WINDOW_CLOSED, bounty, recipient, closedAt, error: result?.error };
    }

    return {
      outcome: SETTLEMENT.CHAIN_FAILED,
      bounty,
      recipient,
      error: result?.error || 'Resolution reported no transaction'
    };
  }

  // The funds have moved. From here nothing may throw: the tx hash is the only
  // record of the transfer, and a caller that retried on an exception would
  // revert on-chain and mark a paid claim failed.
  const recordError = await recordPayout(claim, bounty, result.txHash, deps);

  return {
    outcome: SETTLEMENT.PAID,
    bounty,
    recipient,
    txHash: result.txHash,
    ...(recordError ? { recordError } : {})
  };
}

/**
 * Settle every claim a contributor can settle themselves. Run after they link
 * or change a wallet, so a payout parked for want of one goes out immediately.
 *
 * Claims are settled one at a time so that one failure (or exception) never
 * stops the rest. Each transfer waits for confirmation, so once `budgetMs` has
 * elapsed no new transfer is started: being killed by the request's time limit
 * between sending a transfer and recording it would leave the database behind
 * the chain. Claims not started are returned as DEFERRED, unchanged.
 *
 * @param {number} githubId The contributor, as authenticated by the caller.
 * @param {SettlementDeps} deps Must include `findClaimsByContributor`.
 * @param {object} [options]
 * @param {number} [options.budgetMs] Stop starting settlements after this long.
 * @returns {Promise<Array<{claimId: number, claim: object} & Awaited<ReturnType<typeof settleClaim>>>>}
 *   One entry per settleable claim, in the order found.
 */
export async function settleContributorClaims(githubId, deps, { budgetMs = Infinity } = {}) {
  const startedAt = deps.now();
  const claims = await deps.findClaimsByContributor(githubId);
  const settleable = claims.filter(
    (claim) => SETTLEABLE_CLAIM_STATUSES.has(claim.status) && Number(claim.prAuthorGithubId) === Number(githubId)
  );

  const results = [];
  for (const claim of settleable) {
    if (deps.now() - startedAt >= budgetMs) {
      results.push({ claimId: claim.id, claim, outcome: SETTLEMENT.DEFERRED });
      continue;
    }
    try {
      results.push({ claimId: claim.id, claim, ...(await settleClaim(claim, deps)) });
    } catch (error) {
      results.push({ claimId: claim.id, claim, outcome: SETTLEMENT.ERROR, error });
    }
  }
  return results;
}

/**
 * The part of a settlement result that may leave the server.
 *
 * `error` is dropped: a provider error embeds the configured RPC URL (commonly
 * with an API key) and a thrown database error can name hosts and users. The
 * recipient address is dropped too; the caller already knows its own wallet.
 *
 * @param {object} result An entry from `settleContributorClaims`, or a
 *   `settleClaim` result with `claimId` and `claim` added.
 * @returns {object}
 */
export function toPublicSettlement(result) {
  const { claim, bounty } = result;
  const summary = { claimId: result.claimId, outcome: result.outcome };

  if (result.reason) summary.reason = result.reason;

  const repoFullName = bounty?.repoFullName ?? claim?.repoFullName;
  if (repoFullName !== undefined) summary.repoFullName = repoFullName;
  if (bounty?.issueNumber !== undefined) summary.issueNumber = bounty.issueNumber;
  if (claim?.prNumber !== undefined) summary.prNumber = claim.prNumber;
  if (bounty?.amount !== undefined) summary.amount = bounty.amount;
  if (bounty?.tokenSymbol !== undefined) summary.tokenSymbol = bounty.tokenSymbol;
  if (result.txHash) summary.txHash = result.txHash;
  if (result.closedAt !== undefined) summary.closedAt = result.closedAt;

  return summary;
}

/**
 * Last second, in chain time, at which the contract accepts `resolve`.
 * `null` when the deadline is unreadable: let the contract decide.
 */
function settlementWindowClosesAt(bounty) {
  if (bounty.deadline === null || bounty.deadline === undefined) return null;
  const deadline = Number(bounty.deadline);
  return Number.isFinite(deadline) ? deadline + RESOLVE_GRACE_SECONDS : null;
}

/** Record a completed transfer. Returns the first error instead of throwing. */
async function recordPayout(claim, bounty, txHash, deps) {
  let firstError = null;

  try {
    await deps.markBountyResolved(bounty.bountyId, txHash);
  } catch (error) {
    firstError = error;
  }

  try {
    await deps.markClaim(claim.id, CLAIM_STATUS.PAID, { txHash, resolvedAt: deps.now() });
  } catch (error) {
    firstError = firstError || error;
  }

  return firstError;
}

function skipped(reason, bounty) {
  return bounty ? { outcome: SETTLEMENT.SKIPPED, reason, bounty } : { outcome: SETTLEMENT.SKIPPED, reason };
}
