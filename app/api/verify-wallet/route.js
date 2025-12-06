import { logger } from '@/lib/logger';
import { getSession } from '@/lib/session';
import { SiweMessage } from 'siwe';
import { createPublicClient, http } from 'viem';
import { base, baseSepolia } from 'viem/chains';
import { getAliasByChainId, REGISTRY } from '@/config/chain-registry';

// Map chainId to viem chain object
const CHAIN_MAP = {
  8453: base,
  84532: baseSepolia,
};

/**
 * Get a viem public client for a given chainId.
 * Required for ERC-1271/ERC-6492 smart wallet signature verification.
 */
function getPublicClientForChainId(chainId) {
  // Try to find a configured network with this chainId
  const networkInfo = getAliasByChainId(chainId);
  const viemChain = CHAIN_MAP[chainId];
  
  if (networkInfo?.rpcUrl) {
    return createPublicClient({
      chain: viemChain || { id: chainId, name: `Chain ${chainId}`, nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 }, rpcUrls: { default: { http: [networkInfo.rpcUrl] } } },
      transport: http(networkInfo.rpcUrl),
    });
  }
  
  // Fallback to first available network's RPC
  const aliases = Object.keys(REGISTRY);
  if (aliases.length > 0) {
    const fallbackNetwork = REGISTRY[aliases[0]];
    return createPublicClient({
      chain: CHAIN_MAP[fallbackNetwork.chainId] || { id: fallbackNetwork.chainId, name: fallbackNetwork.name, nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 }, rpcUrls: { default: { http: [fallbackNetwork.rpcUrl] } } },
      transport: http(fallbackNetwork.rpcUrl),
    });
  }
  
  return null;
}

/**
 * Verify a SIWE message signature supporting:
 * - Standard ECDSA signatures (EOAs)
 * - ERC-1271 signatures (deployed smart contract wallets)
 * - ERC-6492 signatures (undeployed/counterfactual smart wallets like Coinbase Smart Wallet)
 */
async function verifySmartWalletSignature(publicClient, address, message, signature) {
  try {
    // viem's verifyMessage handles EOA, ERC-1271, and ERC-6492 signatures
    const isValid = await publicClient.verifyMessage({
      address,
      message,
      signature,
    });
    return isValid;
  } catch (error) {
    logger.error('Smart wallet signature verification error:', error);
    return false;
  }
}

export async function POST(request) {
  try {
    const { message, signature } = await request.json();

    if (!message || !signature) {
      return Response.json({ error: 'Missing message or signature' }, { status: 400 });
    }

    const session = await getSession();
    
    // Parse the SIWE message to extract fields
    let siweMessage;
    try {
      siweMessage = new SiweMessage(message);
    } catch (parseError) {
      logger.error('Failed to parse SIWE message:', parseError.message);
      return Response.json({ error: 'Invalid message format' }, { status: 400 });
    }

    // Validate nonce if we have one stored in session
    if (session.siweNonce && siweMessage.nonce !== session.siweNonce) {
      logger.error('Nonce mismatch:', { expected: session.siweNonce, received: siweMessage.nonce });
      return Response.json({ error: 'Invalid nonce' }, { status: 401 });
    }

    // Validate issuedAt and expiry if present
    const now = new Date();
    if (siweMessage.issuedAt) {
      const issuedAt = new Date(siweMessage.issuedAt);
      // Allow some clock skew (5 minutes)
      if (issuedAt > new Date(now.getTime() + 5 * 60 * 1000)) {
        return Response.json({ error: 'Message issued in the future' }, { status: 401 });
      }
    }
    if (siweMessage.expirationTime) {
      const expiry = new Date(siweMessage.expirationTime);
      if (expiry < now) {
        return Response.json({ error: 'Message has expired' }, { status: 401 });
      }
    }

    // Get public client for smart wallet signature verification
    const publicClient = getPublicClientForChainId(siweMessage.chainId);
    if (!publicClient) {
      logger.error('No public client available for chainId:', siweMessage.chainId);
      return Response.json({ error: 'Unsupported chain' }, { status: 400 });
    }

    // Verify the signature using viem (supports EOA, ERC-1271, ERC-6492)
    const isValid = await verifySmartWalletSignature(
      publicClient,
      siweMessage.address,
      message,
      signature
    );

    if (!isValid) {
      logger.error('Signature verification failed for address:', siweMessage.address);
      return Response.json({ error: 'Invalid signature' }, { status: 401 });
    }

    // Store wallet in session
    session.walletAddress = siweMessage.address;
    session.chainId = siweMessage.chainId;
    session.siweNonce = null; // Clear used nonce
    await session.save();

    logger.info('Wallet verified successfully:', siweMessage.address);

    return Response.json({
      success: true,
      address: siweMessage.address
    });
  } catch (error) {
    logger.error('Error verifying wallet:', error);
    return Response.json({ error: 'Verification failed' }, { status: 500 });
  }
}
