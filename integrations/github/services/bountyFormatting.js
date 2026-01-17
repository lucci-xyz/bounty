import { ethers } from 'ethers';
import { REGISTRY } from '../../../config/chain-registry.js';

export function networkMeta(networkKey) {
  if (!networkKey) {
    throw new Error('Missing network alias for bounty notification.');
  }

  const config = REGISTRY[networkKey];
  if (!config) {
    throw new Error(`Network alias "${networkKey}" is not configured in the registry.`);
  }

  const explorerBase = config.blockExplorerUrl?.replace(/\/$/, '');
  if (!explorerBase) {
    throw new Error(`Block explorer URL is missing for network "${networkKey}".`);
  }

  const resolvedName = config.name || networkKey;

  return {
    name: resolvedName,
    explorerTx: (hash) => `${explorerBase}/tx/${hash}`
  };
}

export function formatAmountByToken(amount, tokenSymbol) {
  const symbol = String(tokenSymbol || '').toUpperCase();
  const decimalsBySymbol = {
    USDC: 6,
    EURC: 6
  };
  const decimals = decimalsBySymbol[symbol] ?? 6;
  try {
    return ethers.formatUnits(amount, decimals);
  } catch {
    return amount;
  }
}

