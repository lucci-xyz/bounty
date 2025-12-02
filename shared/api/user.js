import { fetchJson, fetchJsonOrNull } from './client';

/**
 * Get the current logged in user's Github profile, if authenticated.
 * @returns {Promise<Object|null>} The Github user data or null.
 */
export function getGithubUser() {
  return fetchJsonOrNull('/api/oauth/user');
}

/**
 * Get the current user's profile information.
 * @returns {Promise<Object|null>} The profile data or null.
 */
export function getUserProfile() {
  return fetchJsonOrNull('/api/user/profile');
}

/**
 * Get the list of bounties created by the current user.
 * @returns {Promise<Array>} The user's bounties.
 */
export function getUserBounties() {
  return fetchJson('/api/user/bounties');
}

/**
 * Get statistics for the current user.
 * @returns {Promise<Object>} The user's stats.
 */
export function getUserStats() {
  return fetchJson('/api/user/stats');
}

/**
 * Get the list of bounties claimed by the current user.
 * @returns {Promise<Array>} The claimed bounties.
 */
export function getClaimedBounties() {
  return fetchJson('/api/user/claimed-bounties');
}

/**
 * Get a user's wallet address by their Github user ID.
 * @param {string} githubId - The Github user ID.
 * @returns {Promise<Object|null>} The wallet data or null.
 */
export function getUserWalletByGithubId(githubId) {
  if (!githubId) {
    return Promise.resolve(null);
  }
  return fetchJsonOrNull(`/api/wallet/${githubId}`);
}

export function requestEmailVerification(email) {
  return fetchJson('/api/user/email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email })
  });
}
