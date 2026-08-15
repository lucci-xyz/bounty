/**
 * Redaction for bounty records served to unauthenticated callers.
 *
 * Bounty rows carry both `sponsorGithubId` and `sponsorAddress`. The harm is
 * the PAIRING, not either field alone: an address is already public on-chain,
 * but publishing it alongside the GitHub id turns these endpoints into a
 * name-to-wallet directory — resolve each id through GitHub's public user API
 * and every sponsor is deanonymised, with their funded balance attached.
 *
 * Only `sponsorGithubId` is removed. `sponsorAddress` stays, because it is
 * already readable from the escrow and some flows compare against it. Routes
 * that authenticate the caller keep serving the full record.
 */

/** Fields that identify a sponsor and must not be published. */
const SPONSOR_IDENTITY_FIELDS = ['sponsorGithubId'];

/**
 * Strip sponsor identity from a single bounty record.
 *
 * @param {object|null|undefined} bounty
 * @returns {object|null|undefined} A shallow copy without sponsor identity.
 */
export function toPublicBounty(bounty) {
  if (!bounty || typeof bounty !== 'object') return bounty;

  const copy = { ...bounty };
  for (const field of SPONSOR_IDENTITY_FIELDS) {
    delete copy[field];
  }
  return copy;
}

/**
 * Strip sponsor identity from a list of bounty records.
 *
 * @param {Array<object>|null|undefined} bounties
 * @returns {Array<object>} Redacted copies; a non-array input yields [].
 */
export function toPublicBounties(bounties) {
  if (!Array.isArray(bounties)) return [];
  return bounties.map(toPublicBounty);
}
