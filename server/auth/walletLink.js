/**
 * Validates an Ethereum address format.
 * Uses ethers.js checksum validation when available, falls back to regex.
 */
async function validateEthereumAddress(value) {
  if (typeof value !== 'string' || !/^0x[a-fA-F0-9]{40}$/.test(value)) {
    return null;
  }
  try {
    const { ethers } = await import('ethers');
    return ethers.getAddress(value);
  } catch {
    // If ethers is unavailable (e.g. test env), regex match above is sufficient
    return value;
  }
}

function isLikelyEthereumAddress(value) {
  return typeof value === 'string' && /^0x[a-fA-F0-9]{40}$/.test(value);
}

export function getWalletLinkPayload(session, body = {}) {
  if (!session?.githubId || !session?.githubUsername) {
    throw new Error('GitHub authentication required');
  }

  const walletAddress = typeof body.walletAddress === 'string' ? body.walletAddress.trim() : '';
  if (!walletAddress || !isLikelyEthereumAddress(walletAddress)) {
    throw new Error('Valid walletAddress is required');
  }

  const authenticatedWallet = typeof session.walletAddress === 'string'
    ? session.walletAddress.toLowerCase()
    : '';
  if (!authenticatedWallet || authenticatedWallet !== walletAddress.toLowerCase()) {
    throw new Error('Wallet not authenticated');
  }

  return {
    githubId: session.githubId,
    githubUsername: session.githubUsername,
    walletAddress: walletAddress.toLowerCase()
  };
}

export function clearWalletSession(session) {
  delete session.walletAddress;
  delete session.chainId;
  delete session.siweNonce;
}
