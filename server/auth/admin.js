import { getSession } from '@/lib/session';

/**
 * List of GitHub IDs with admin access.
 * Configured via ADMIN_GITHUB_IDS environment variable (comma-separated).
 */
const ADMIN_GITHUB_IDS = (process.env.ADMIN_GITHUB_IDS || '')
  .split(',')
  .map(id => id.trim())
  .filter(Boolean)
  .map(id => BigInt(id));

/**
 * Checks if the given GitHub ID is an admin.
 * @param {string|number|bigint} githubId
 * @returns {boolean}
 */
export function isAdminGithubId(githubId) {
  if (!githubId) return false;
  return ADMIN_GITHUB_IDS.includes(BigInt(githubId));
}

/**
 * Validates the current session is authenticated and has admin access.
 * Returns the session if valid, or an error response object.
 *
 * @returns {Promise<{session: Object}|{error: string, status: number}>}
 */
export async function requireAdmin() {
  const session = await getSession();

  if (!session?.githubId) {
    return { error: 'Not authenticated', status: 401 };
  }

  if (!isAdminGithubId(session.githubId)) {
    return { error: 'Admin access required', status: 403 };
  }

  return { session };
}

