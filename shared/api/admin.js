import { fetchJsonOrNull } from './client';

/**
 * Checks if the current user has admin access.
 * 
 * @returns {Promise<boolean>} True if the user is an admin, false otherwise.
 */
export async function checkAdminAccess() {
  const data = await fetchJsonOrNull('/api/admin/check');
  return Boolean(data?.isAdmin);
}

