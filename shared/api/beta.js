import { fetchJson, postJson } from './client';

/**
 * Fetch the list of beta program applications.
 * @returns {Promise<Array>} Array of application objects.
 */
export function getBetaApplications() {
  return fetchJson('/api/beta/applications');
}

/**
 * Review a beta application by approving or rejecting it.
 * @param {string} applicationId - The ID of the application to review.
 * @param {string} action - The review action ('approve' or 'reject').
 * @returns {Promise<any>} The server response.
 */
export function reviewBetaApplication(applicationId, action) {
  return postJson('/api/beta/review', { applicationId, action });
}

/**
 * Apply for beta access with email
 * @param {string} email - User's email address
 * @returns {Promise<any>} The server response
 */
export function applyForBeta(email) {
  return postJson('/api/beta/apply', { email });
}

