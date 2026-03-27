/**
 * Validation utilities for common input types
 */

/**
 * Validates an email address format
 * @param {string} email - Email to validate
 * @returns {boolean} True if valid
 */
export function isValidEmail(email) {
  if (!email || typeof email !== 'string') return false;
  const trimmed = email.trim();
  // Require at least 2 chars in TLD, reasonable local part
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z]{2,})+$/;
  return trimmed.length <= 254 && emailRegex.test(trimmed);
}

/**
 * Validates a transaction hash (0x-prefixed, 32 bytes hex)
 * @param {string} hash
 * @returns {boolean}
 */
export function isValidTxHash(hash) {
  return typeof hash === 'string' && /^0x[a-fA-F0-9]{64}$/.test(hash);
}

/**
 * Validates a bounty ID (0x-prefixed, 32 bytes hex)
 * @param {string} bountyId
 * @returns {boolean}
 */
export function isValidBountyId(bountyId) {
  return typeof bountyId === 'string' && /^0x[a-fA-F0-9]{64}$/.test(bountyId);
}

/**
 * Validates an Ethereum address (basic format check)
 * @param {string} address
 * @returns {boolean}
 */
export function isValidAddress(address) {
  return typeof address === 'string' && /^0x[a-fA-F0-9]{40}$/.test(address);
}
