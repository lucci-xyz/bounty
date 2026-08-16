/**
 * The allowlist decision, separated from the database read.
 *
 * A sponsor can restrict a bounty to specific wallet addresses. The rule that
 * makes this safe to enforce on the payout path is the empty case: a bounty
 * with no entries is UNRESTRICTED, not closed to everyone.
 *
 * Getting that backwards is not hypothetical — the original `checkAllowed`
 * returned a bare `false` when a sponsor had no entries, which would have
 * stopped every payout on every bounty the moment it was wired in. That is
 * almost certainly why it sat with no call sites while the UI kept promising
 * sponsors their restriction was in force.
 */

/**
 * Decide whether an address may receive a bounty's funds.
 *
 * @param {Array<{allowedAddress?: string}>|null|undefined} entries
 *   Allowlist rows covering this bounty (bounty-specific and repo-wide).
 * @param {string} address Recipient address.
 * @returns {{ allowed: boolean, restricted: boolean }}
 *   `restricted` reports whether the sponsor expressed any restriction at all,
 *   so callers can distinguish "open bounty" from "explicitly refused".
 */
export function decideAllowlist(entries, address) {
  const list = Array.isArray(entries) ? entries : [];

  // No entries means the sponsor never restricted this bounty.
  if (list.length === 0) return { allowed: true, restricted: false };

  const target = String(address || '').trim().toLowerCase();
  if (!target) return { allowed: false, restricted: true };

  const allowed = list.some(
    (entry) => String(entry?.allowedAddress || '').trim().toLowerCase() === target
  );

  return { allowed, restricted: true };
}
