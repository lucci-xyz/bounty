import { SiweMessage } from 'siwe';
import { CONFIG } from '../config.js';

/**
 * Generate a SIWE nonce
 */
export function generateNonce() {
  return Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15);
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
 * Create a SIWE message for signing
 */
export function createSIWEMessage(address, nonce, chainId = CONFIG.blockchain.chainId) {
  return new SiweMessage({
    domain: new URL(CONFIG.frontendUrl).host,
    address,
    statement: 'Sign in to BountyPay to link your GitHub account with your wallet.',
    uri: CONFIG.frontendUrl,
    version: '1',
    chainId,
    nonce
  });
}

