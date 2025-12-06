import { logger } from '@/lib/logger';
import { SiweMessage } from 'siwe';
import { randomBytes } from 'crypto';
import { CONFIG } from '../config.js';
import { getDefaultAliasForGroup, REGISTRY } from '../../config/chain-registry.js';

export const DEFAULT_SIWE_STATEMENT = 'Link your wallet to receive BountyPay payments.';
export const DEFAULT_SIWE_VERSION = '1';

/**
 * Return the domain to use in a SIWE message.
 * If not provided, tries window.location, otherwise uses CONFIG frontend URL.
 * @param {string} [domain]
 * @returns {string}
 */
function resolveDomain(domain) {
  if (domain) return domain;
  if (typeof window !== 'undefined' && window.location?.host) {
    return window.location.host;
  }
  return new URL(CONFIG.frontendUrl).host;
}

/**
 * Return the URI to use in a SIWE message.
 * If not provided, tries window.location.origin, otherwise uses CONFIG frontend URL.
 * @param {string} [uri]
 * @returns {string}
 */
function resolveUri(uri) {
  if (uri) return uri;
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin;
  }
  return CONFIG.frontendUrl;
}

/**
 * Build the payload for a SIWE message.
 * @param {object} options
 * @param {string} options.address - Wallet address
 * @param {string} options.nonce - Nonce
 * @param {number} options.chainId - Chain ID
 * @param {string} [options.domain] - Domain (optional)
 * @param {string} [options.uri] - URI (optional)
 * @param {string} [options.statement] - Statement (optional)
 * @param {string} [options.version] - Version (optional)
 * @param {string} [options.issuedAt] - Time issued (optional)
 * @param {string[]} [options.resources] - Extra resources (optional)
 * @returns {object}
 */
export function buildSiweMessagePayload({
  address,
  nonce,
  chainId,
  domain,
  uri,
  statement = DEFAULT_SIWE_STATEMENT,
  version = DEFAULT_SIWE_VERSION,
  issuedAt = new Date().toISOString(),
  resources
}) {
  if (!address) {
    throw new Error('SIWE message requires an address');
  }
  if (!nonce) {
    throw new Error('SIWE message requires a nonce');
  }
  if (!chainId) {
    throw new Error('SIWE message requires a chainId');
  }

  const payload = {
    domain: resolveDomain(domain),
    address,
    statement,
    uri: resolveUri(uri),
    version,
    chainId,
    nonce,
    issuedAt
  };

  if (resources?.length) {
    payload.resources = resources;
  }

  return payload;
}

/**
 * Create a new SiweMessage instance from the given options.
 * @param {object} options - See buildSiweMessagePayload
 * @returns {SiweMessage}
 */
export function createSiweMessageInstance(options) {
  return new SiweMessage(buildSiweMessagePayload(options));
}

/**
 * Generate a random SIWE nonce.
 * @returns {string}
 */
export function generateNonce() {
  return randomBytes(32).toString('hex');
}

/**
 * Verify a SIWE message and signature.
 * @param {object|string} message - The SIWE message or its fields
 * @param {string} signature - The message signature
 * @returns {Promise<{success: boolean, address?: string, chainId?: number, error?: string}>}
 */
export async function verifySIWE(message, signature) {
  try {
    const siweMessage = new SiweMessage(message);
    const fields = await siweMessage.verify({ signature });

    return {
      success: true,
      address: fields.data.address,
      chainId: fields.data.chainId
    };
  } catch (error) {
    logger.error('SIWE verification failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Get the default chainId for SIWE messages (prefers mainnet).
 * @returns {number}
 */
function getDefaultChainId() {
  try {
    // Try mainnet first, fall back to testnet
    const defaultAlias = getDefaultAliasForGroup('mainnet');
    return REGISTRY[defaultAlias].chainId;
  } catch {
    try {
      const testnetAlias = getDefaultAliasForGroup('testnet');
      return REGISTRY[testnetAlias].chainId;
    } catch {
      const firstAlias = Object.keys(REGISTRY)[0];
      if (firstAlias) {
        return REGISTRY[firstAlias].chainId;
      }
      throw new Error('No blockchain networks configured');
    }
  }
}

const DEFAULT_SERVER_STATEMENT =
  'Sign in to BountyPay to link your GitHub account with your wallet.';

/**
 * Create a SIWE message for signing.
 * @param {string} address - Wallet address
 * @param {string} nonce - Nonce
 * @param {number} [chainId] - Chain ID (optional)
 * @param {object} [overrides] - Optional fields to override in the message
 * @returns {SiweMessage}
 */
export function createSIWEMessage(address, nonce, chainId, overrides = {}) {
  const finalChainId = chainId || getDefaultChainId();

  return createSiweMessageInstance({
    address,
    nonce,
    chainId: finalChainId,
    statement: overrides.statement || DEFAULT_SERVER_STATEMENT,
    domain: overrides.domain || new URL(CONFIG.frontendUrl).host,
    uri: overrides.uri || CONFIG.frontendUrl,
    issuedAt: overrides.issuedAt,
    resources: overrides.resources
  });
}

/**
 * Create a SIWE message text for user signing.
 * @param {string} address - Wallet address
 * @param {string} nonce - Nonce
 * @param {number} [chainId] - Chain ID (optional)
 * @param {object} [overrides] - Optional fields to override
 * @returns {string}
 */
export function createSIWEMessageText(address, nonce, chainId, overrides) {
  return createSIWEMessage(address, nonce, chainId, overrides).prepareMessage();
}
