import { SiweMessage } from 'siwe';
import { randomBytes } from 'crypto';
import { CONFIG } from '../config.js';
import { getDefaultAliasForGroup, REGISTRY } from '../../config/chain-registry.js';

/**
 * Generate a cryptographically secure SIWE nonce
 */
export function generateNonce() {
  // Generate 32 bytes of cryptographically secure random data
  // and convert to hex string (64 characters)
  return randomBytes(32).toString('hex');
}

/**
 * Verify a SIWE message and signature
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
    console.error('SIWE verification failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Get default chainId for SIWE (uses default testnet)
 */
function getDefaultChainId() {
  try {
    const defaultAlias = getDefaultAliasForGroup('testnet');
    return REGISTRY[defaultAlias].chainId;
  } catch (error) {
    // Fallback to first available network if testnet not configured
    const firstAlias = Object.keys(REGISTRY)[0];
    if (firstAlias) {
      return REGISTRY[firstAlias].chainId;
    }
    throw new Error('No blockchain networks configured');
  }
}

/**
 * Create a SIWE message for signing
 * @param {string} address - Wallet address
 * @param {string} nonce - Unique nonce for this message
 * @param {number} [chainId] - Optional chainId, defaults to testnet default
 */
export function createSIWEMessage(address, nonce, chainId) {
  const finalChainId = chainId || getDefaultChainId();
  
  return new SiweMessage({
    domain: new URL(CONFIG.frontendUrl).host,
    address,
    statement: 'Sign in to BountyPay to link your GitHub account with your wallet.',
    uri: CONFIG.frontendUrl,
    version: '1',
    chainId: finalChainId,
    nonce
  });
}

