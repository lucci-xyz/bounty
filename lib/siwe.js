/**
 * SIWE (Sign-In With Ethereum) utilities
 */

/**
 * Creates a SIWE message for wallet verification
 * @param {object} params - Message parameters
 * @param {string} params.domain - The domain requesting signature
 * @param {string} params.address - The Ethereum address
 * @param {string} params.statement - Human-readable statement
 * @param {string} params.uri - The URI of the application
 * @param {string} params.version - SIWE version
 * @param {number} params.chainId - Chain ID
 * @param {string} params.nonce - Random nonce
 * @returns {string} The formatted SIWE message
 */
export function createSiweMessage({ domain, address, statement, uri, version, chainId, nonce }) {
  const message = [
    `${domain} wants you to sign in with your Ethereum account:`,
    address,
    '',
    statement,
    '',
    `URI: ${uri}`,
    `Version: ${version}`,
    `Chain ID: ${chainId}`,
    `Nonce: ${nonce}`,
    `Issued At: ${new Date().toISOString()}`
  ].join('\n');

  return message;
}

