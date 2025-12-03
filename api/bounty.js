import { fetchJson } from './client';

/**
 * Read on-chain bounty state using the stored network alias.
 * @param {string} bountyId
 * @returns {Promise<object>}
 */
export function getContractBounty(bountyId) {
  return fetchJson(`/api/contract/bounty/${bountyId}`);
}
