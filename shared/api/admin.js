import { fetchJson, fetchJsonOrNull } from './client';

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

