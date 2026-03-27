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

/**
 * Resolve token decimals from the registry. Falls back to well-known defaults.
 */
function getTokenDecimals(tokenSymbol) {
  // Check all registry entries for a matching token
  for (const config of Object.values(REGISTRY)) {
    if (config.token.symbol === tokenSymbol) return config.token.decimals;
    const additional = (config.additionalTokens || []).find(t => t.symbol === tokenSymbol);
    if (additional) return additional.decimals;
  }
  // Well-known fallbacks
  if (tokenSymbol === 'MUSD') return 18;
  return 6;
}

export function formatAmountByToken(amount, tokenSymbol) {
  const decimals = getTokenDecimals(tokenSymbol);
  try {
    return ethers.formatUnits(amount, decimals);
  } catch {
    return amount;
  }
}

export { getTokenDecimals };

