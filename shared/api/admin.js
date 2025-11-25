import { fetchJson, fetchJsonOrNull, postJson } from './client';

/**
 * Checks if the current user has admin access.
 * 
 * @returns {Promise<boolean>} True if the user is an admin, false otherwise.
 */
export async function checkAdminAccess() {
  const data = await fetchJsonOrNull('/api/admin/check');
  return Boolean(data?.isAdmin);
}

/**
 * Fetch fee balances from all configured networks.
 * Admin-only endpoint.
 * 
 * @returns {Promise<Object>} Object containing network fee information.
 */
export async function getNetworkFees() {
  return fetchJson('/api/admin/fees');
}

/**
 * Withdraw accumulated fees from a specific network.
 * Admin-only endpoint.
 * 
 * @param {string} alias - Network alias (e.g., 'BASE_SEPOLIA')
 * @param {string} treasury - Address to withdraw fees to
 * @param {string} [amount='0'] - Amount to withdraw (0 = withdraw all available)
 * @returns {Promise<Object>} Transaction result with txHash and amount.
 */
export async function withdrawNetworkFees(alias, treasury, amount = '0') {
  return postJson('/api/admin/fees/withdraw', { alias, treasury, amount });
}

