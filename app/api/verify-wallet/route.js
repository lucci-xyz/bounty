import { logger } from '@/lib/logger';
import { getSession } from '@/lib/session';
import { SiweMessage } from 'siwe';
import { ethers } from 'ethers';
import { getAliasByChainId, REGISTRY } from '@/config/chain-registry';

/**
 * Get an ethers provider for a given chainId.
 * Used for ERC-1271 smart contract wallet signature verification.
 */
function getProviderForChainId(chainId) {
  // Try to find a configured network with this chainId
  const networkInfo = getAliasByChainId(chainId);
  if (networkInfo?.rpcUrl) {
    return new ethers.JsonRpcProvider(networkInfo.rpcUrl);
  }
  
  // Fallback to first available network's RPC (better than nothing for ERC-1271)
  const aliases = Object.keys(REGISTRY);
  if (aliases.length > 0) {
    return new ethers.JsonRpcProvider(REGISTRY[aliases[0]].rpcUrl);
  }
  
  return null;
}

export async function POST(request) {
  try {
    const { message, signature } = await request.json();

    if (!message || !signature) {
      return Response.json({ error: 'Missing message or signature' }, { status: 400 });
    }

    const session = await getSession();
    
    // Parse the SIWE message
    let siweMessage;
    try {
      siweMessage = new SiweMessage(message);
    } catch (parseError) {
      logger.error('Failed to parse SIWE message:', parseError.message);
      return Response.json({ error: 'Invalid message format' }, { status: 400 });
    }

    // Verify the signature with nonce validation
    try {
      const verifyParams = { signature };
      
      // Add nonce validation if we have one stored in session
      if (session.siweNonce) {
        verifyParams.nonce = session.siweNonce;
      }
      
      // Get a provider for ERC-1271 smart contract wallet signature verification
      // This is required for smart wallets like Coinbase Smart Wallet that use
      // WebAuthn/passkeys and return ERC-1271 signatures instead of standard ECDSA
      const provider = getProviderForChainId(siweMessage.chainId);
      if (provider) {
        verifyParams.provider = provider;
      }
      
      const { data: fields } = await siweMessage.verify(verifyParams);

      // Store wallet in session
      session.walletAddress = fields.address;
      session.chainId = fields.chainId;
      session.siweNonce = null; // Clear used nonce
      await session.save();

      logger.info('Wallet verified successfully:', fields.address);

      return Response.json({
        success: true,
        address: fields.address
      });
    } catch (verifyError) {
      logger.error('SIWE verification failed:', verifyError.message);
      return Response.json({ error: verifyError.message || 'Invalid signature' }, { status: 401 });
    }
  } catch (error) {
    logger.error('Error verifying wallet:', error);
    return Response.json({ error: 'Verification failed' }, { status: 500 });
  }
}
