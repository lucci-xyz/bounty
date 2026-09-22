/**
 * Canonical bounty status definitions.
 * Single source of truth for all status-related logic.
 */

// Database status values (lowercase strings)
// Contract statuses: None, Open, Resolved, Refunded (no cancel function exists).
export const BOUNTY_STATUS = {
  OPEN: 'open',
  // Transient: a payout worker holds the lease and may be mid-transaction.
  // Never terminal; readers treat it as "funds in flight, not open".
  RESOLVING: 'resolving',
  RESOLVED: 'resolved',
  REFUNDED: 'refunded'
};

// Contract status enum mapping (numeric to string)
// Matches contracts/current/BountyEscrow.sol: enum Status { None=0, Open=1, Resolved=2, Refunded=3 }
export const CONTRACT_STATUS_MAP = {
  0: null, // None - bounty doesn't exist
  1: 'open',
  2: 'resolved',
  3: 'refunded'
};

// Statuses that indicate bounty is no longer active (funds have been moved).
// `resolving` is deliberately excluded: it is a transient lease, not an outcome.
export const TERMINAL_STATUSES = new Set(['resolved', 'refunded']);

// All valid status values
export const VALID_STATUSES = new Set(['open', 'resolving', 'resolved', 'refunded']);

/**
 * Validate a status value
 */
export function isValidStatus(status) {
  return VALID_STATUSES.has(status);
}

/**
 * Check if a bounty is in a terminal state (no longer active)
 */
export function isTerminalStatus(status) {
  return TERMINAL_STATUSES.has(status);
}

/**
 * Convert contract numeric status to database string status
 */
export function contractStatusToDb(contractStatus) {
  return CONTRACT_STATUS_MAP[Number(contractStatus)] || null;
}

/**
 * Get human-readable status label
 */
export function getStatusLabel(status) {
  const labels = {
    open: 'Open',
    resolving: 'Resolving',
    resolved: 'Resolved',
    refunded: 'Refunded'
  };
  return labels[status] || 'Unknown';
}

/**
 * Derive lifecycle state from bounty data.
 * On-chain statuses: open, resolved, refunded.
 * UI adds 'expired' for open bounties past deadline (eligible for refundExpired).
 */
export function deriveLifecycle(bounty, nowSeconds = Math.floor(Date.now() / 1000)) {
  const deadlineSeconds = Number(bounty?.deadline);
  const hasDeadline = Number.isFinite(deadlineSeconds);
  // Match BountyEscrow.sol: refundExpired requires block.timestamp > deadline
  // (strict), and resolve is still allowed at block.timestamp == deadline. So a
  // bounty only counts as expired once now is strictly past the deadline.
  const deadlinePassed = hasDeadline && nowSeconds > deadlineSeconds;
  const status = bounty?.status;
  const isTerminal = isTerminalStatus(status);

  // Terminal statuses: resolved, refunded
  if (isTerminal) {
    return {
      state: status,
      label: getStatusLabel(status),
      secondsRemaining: 0,
      deadline: hasDeadline ? deadlineSeconds : null
    };
  }

  // Open but expired (eligible for refund)
  if (deadlinePassed) {
    return {
      state: 'expired',
      label: 'Expired',
      secondsRemaining: 0,
      deadline: hasDeadline ? deadlineSeconds : null,
      expiredAt: hasDeadline ? deadlineSeconds : null
    };
  }

  // Active open bounty
  return {
    state: 'open',
    label: 'Open',
    secondsRemaining: hasDeadline ? Math.max(0, deadlineSeconds - nowSeconds) : null,
    deadline: hasDeadline ? deadlineSeconds : null
  };
}

/**
 * Check if a bounty is eligible for refund.
 * Eligibility requires: open status + expired deadline.
 */
export function isRefundEligible(bounty, nowSeconds = Math.floor(Date.now() / 1000)) {
  if (bounty?.status !== 'open') return false;
  const deadline = Number(bounty?.deadline);
  // Strictly past the deadline, mirroring the contract's refundExpired guard
  // (block.timestamp > deadline). At exactly the deadline an on-chain refund
  // would revert with DeadlineNotReached, so it is not yet eligible.
  return Number.isFinite(deadline) && nowSeconds > deadline;
}

/**
 * PR claim statuses (pr_claims.status). Application-level; there is no
 * contract counterpart. `processing` is the transient in-flight state owned
 * by the payout guard — never terminal, never shown as an outcome.
 */
export const CLAIM_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  PAID: 'paid',
  FAILED: 'failed',
  PENDING_WALLET: 'pending_wallet'
};

// Claim states that may enter the payout guard. `paid` never re-enters.
// `processing` re-enters only when a stale bounty lease is stolen, which is
// how a worker that died mid-payout gets recovered instead of stuck.
export const CLAIM_ACQUIRABLE_STATUSES = [
  CLAIM_STATUS.PENDING,
  CLAIM_STATUS.FAILED,
  CLAIM_STATUS.PENDING_WALLET
];

// Bounty states the payout entry points hand to the settle guard. `resolving`
// must be included: a worker that died mid-payout leaves the row there, and
// the guard is the only thing that can steal a stale lease and recover it.
// Gating on `open` alone makes that recovery unreachable.
export const BOUNTY_PAYOUT_CANDIDATE_STATUSES = [BOUNTY_STATUS.OPEN, BOUNTY_STATUS.RESOLVING];

/**
 * Whether a bounty status should be handed to the payout guard at all.
 */
export function isPayoutCandidateBountyStatus(status) {
  return BOUNTY_PAYOUT_CANDIDATE_STATUSES.includes(status);
}

// Claim states the manual retry route accepts. `processing` is included for
// the same reason as `resolving` above: the guard decides whether the lease
// is fresh (skip, 409) or stale (steal and recover).
export const CLAIM_RETRYABLE_STATUSES = [
  CLAIM_STATUS.FAILED,
  CLAIM_STATUS.PENDING_WALLET,
  CLAIM_STATUS.PROCESSING
];

/**
 * Whether a claim status may be submitted to the manual retry route.
 */
export function isRetryableClaimStatus(status) {
  return CLAIM_RETRYABLE_STATUSES.includes(status);
}

/**
 * Whether a claim status may enter the payout guard.
 */
export function isAcquirableClaimStatus(status, includeProcessing = false) {
  if (CLAIM_ACQUIRABLE_STATUSES.includes(status)) return true;
  return includeProcessing === true && status === CLAIM_STATUS.PROCESSING;
}

// How long a `resolving` bounty lease is honoured before another worker may
// steal it. Generous on purpose: stealing while the original worker is still
// sending would double-pay, and a resolve settles in seconds.
export const RESOLVING_LEASE_MS = 10 * 60 * 1000;

/**
 * Whether a `resolving` lease timestamp is old enough to steal. Unknown or
 * missing timestamps are never stale: stealing must be a deliberate
 * recovery, not a default.
 */
export function isResolvingLeaseStale(updatedAt, nowMs = Date.now(), leaseMs = RESOLVING_LEASE_MS) {
  // Number(null) and Number('') are 0, which would read as ancient. A missing
  // timestamp must never authorize a steal.
  if (updatedAt === null || updatedAt === undefined || updatedAt === '') return false;
  const updated = Number(updatedAt);
  if (!Number.isFinite(updated)) return false;
  return updated < nowMs - leaseMs;
}

