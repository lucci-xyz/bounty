/**
 * Utility functions for beta access feature
 */

/**
 * Returns the current beta modal step based on status and access.
 * @param {string} betaStatus
 * @param {boolean} hasAccess
 * @returns {string} The name of the step
 */
export function resolveBetaStep(betaStatus, hasAccess) {
  if (hasAccess) {
    return 'approved';
  }

  switch (betaStatus) {
    case 'needsAuth':
      return 'signin';
    case 'needsApplication':
      return 'apply';
    case 'rejected':
      return 'rejected';
    case 'pending':
      return 'pending';
    default:
      return 'loading';
  }
}

