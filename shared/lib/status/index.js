/**
 * Canonical bounty status definitions.
 * Single source of truth for all status-related logic.
 */

// Database status values (lowercase strings)
export const BOUNTY_STATUS = {
  OPEN: 'open',
  RESOLVED: 'resolved',
  REFUNDED: 'refunded',
  CANCELED: 'canceled'
};

// Contract status enum mapping (numeric to string)
export const CONTRACT_STATUS_MAP = {
  0: null, // None - bounty doesn't exist
  1: 'open',
  2: 'resolved',
  3: 'refunded',
  4: 'canceled'
};

// Statuses that indicate bounty is no longer active (funds have been moved)
export const TERMINAL_STATUSES = new Set(['resolved', 'refunded', 'canceled']);

// All valid status values
export const VALID_STATUSES = new Set(['open', 'resolved', 'refunded', 'canceled']);

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
    resolved: 'Resolved',
    refunded: 'Refunded',
    canceled: 'Canceled'
  };
  return labels[status] || 'Unknown';
}

/**
 * Derive lifecycle state from bounty data.
 * States follow contract standard: open, resolved, refunded, canceled
 * Plus 'expired' for open bounties past deadline.
 */
export function deriveLifecycle(bounty, nowSeconds = Math.floor(Date.now() / 1000)) {
  const deadlineSeconds = Number(bounty?.deadline);
  const hasDeadline = Number.isFinite(deadlineSeconds);
  const deadlinePassed = hasDeadline && deadlineSeconds <= nowSeconds;
  const status = bounty?.status;
  const isTerminal = isTerminalStatus(status);

  // Terminal statuses: resolved, refunded, canceled
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
  return Number.isFinite(deadline) && deadline <= nowSeconds;
}

