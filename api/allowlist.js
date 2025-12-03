  import { deleteJson, fetchJsonOrNull, postJson } from './client';

/**
 * Fetches the allowlist for a given bounty.
 * @param {string} bountyId - The ID of the bounty.
 * @returns {Promise<Array>} The list of allowlist entries, or an empty array if not found.
 */
export async function getAllowlist(bountyId) {
  if (!bountyId) {
    return [];
  }
  const data = await fetchJsonOrNull(`/api/allowlist/${bountyId}`);
  return data ?? [];
}

/**
 * Adds an address to the allowlist for a given bounty.
 * @param {string} bountyId - The ID of the bounty.
 * @param {string} address - The address to add.
 * @returns {Promise<any>} The response from the API.
 */
export function addToAllowlist(bountyId, address) {
  return postJson(`/api/allowlist/${bountyId}`, { address });
}

/**
 * Removes an entry from the allowlist by its ID.
 * @param {string} bountyId - The ID of the bounty.
 * @param {string} allowlistId - The ID of the allowlist entry to remove.
 * @returns {Promise<any>} The response from the API.
 */
export function removeFromAllowlist(bountyId, allowlistId) {
  return deleteJson(`/api/allowlist/${bountyId}`, { allowlistId });
}

