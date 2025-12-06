import { logger } from '@/lib/logger';
import { isAddress } from 'ethers';
import { getLinkHref } from '@/config/links';

let hasLoggedSkippedAliases = false;

// Base Sepolia upgradeable proxy (default for staging/test)
const BASE_SEPOLIA_ESCROW_DEFAULT = process.env.BASE_SEPOLIA_ESCROW_ADDRESS || '0x7218b25e9fbA2974faF7b0056203Fd57591fF8F3';

// Curated network aliases with baseline configuration
const CURATED_ALIASES = {
  BASE_MAINNET: {
    group: 'mainnet',
    chainId: 8453,
    chainIdHex: '0x2105',
    name: 'Base Mainnet',
    rpcUrl: getLinkHref('rpc', 'baseMainnet'),
    blockExplorerUrl: getLinkHref('explorers', 'baseMainnet'),
    supports1559: true,
    nativeCurrency: {
      name: 'ETH',
      symbol: 'ETH',
      decimals: 18
    },
    // Once the production escrow is live we expose curated defaults just like testnets.
    // Env vars still override these when present.
    defaultContracts: {
      escrow: process.env.BASE_MAINNET_ESCROW_ADDRESS || '0xC81A53A0967fc9599d813693B58EcDC7d11e4f36'
    },
    defaultToken: {
      address: process.env.BASE_MAINNET_TOKEN_ADDRESS || '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
      symbol: 'USDC',
      decimals: 6
    }
  },
  MEZO_MAINNET: {
    group: 'mainnet',
    chainId: 31612,
    chainIdHex: '0x7b7c',
    name: 'Mezo Mainnet',
    rpcUrl: getLinkHref('rpc', 'mezoMainnet'),
    blockExplorerUrl: getLinkHref('explorers', 'mezoMainnet'),
    supports1559: false,
    nativeCurrency: {
      name: 'Bitcoin',
      symbol: 'BTC',
      decimals: 18
    }
  },
  BASE_SEPOLIA: {
    group: 'testnet',
    chainId: 84532,
    chainIdHex: '0x14a34',
    name: 'Base Sepolia',
    rpcUrl: getLinkHref('rpc', 'baseSepolia'),
    blockExplorerUrl: getLinkHref('explorers', 'baseSepolia'),
    supports1559: true,
    nativeCurrency: {
      name: 'ETH',
      symbol: 'ETH',
      decimals: 18
    },
    // Hardcoded defaults for local/staging convenience (can be overridden via env)
    defaultContracts: {
      // Upgradeable proxy on Base Sepolia (use this address in app/bots)
      escrow: process.env.BASE_SEPOLIA_ESCROW_ADDRESS || '0x7218b25e9fbA2974faF7b0056203Fd57591fF8F3'
    },
    defaultToken: {
      address: process.env.BASE_SEPOLIA_TOKEN_ADDRESS || '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
      symbol: 'USDC',
      decimals: 6
    },
    // Additional tokens available for bounties (must be allowed in contract via setAllowedToken)
    additionalTokens: [
      {
        address: '0x808456652fdb597867f38412077A9182bf77359F',
        symbol: 'EURC',
        decimals: 6
      }
    ]
  },
  MEZO_TESTNET: {
    group: 'testnet',
    chainId: 31611,
    chainIdHex: '0x7b7b',
    name: 'Mezo Testnet',
    rpcUrl: getLinkHref('rpc', 'mezoPublic'),
    blockExplorerUrl: getLinkHref('explorers', 'mezoTestnet'),
    supports1559: false,
    nativeCurrency: {
      name: 'Bitcoin',
      symbol: 'BTC',
      decimals: 18
    },
    // Hardcoded defaults for local/staging convenience (can be overridden via env)
    defaultContracts: {
      // Upgradeable proxy on Mezo Testnet (deployed 2024-12-06)
      escrow: process.env.MEZO_TESTNET_ESCROW_ADDRESS || '0xA0d0dF8190772449bD764a52Ec1BcBCC8d556b38'
    },
    defaultToken: {
      address: process.env.MEZO_TESTNET_TOKEN_ADDRESS || '0x118917a40FAF1CD7a13dB0Ef56C86De7973Ac503',
      symbol: 'MUSD',
      decimals: 18
    }
  }
};

// ABIs used throughout the application
const ESCROW_ABI_BASE = [
  'function initialize(address primaryToken_, uint16 _feeBps, address initialOwner) external',
  'function createBounty(address resolver, bytes32 repoIdHash, uint64 issueNumber, uint64 deadline, uint256 amount) external returns (bytes32)',
  'function createBountyWithToken(address token, address resolver, bytes32 repoIdHash, uint64 issueNumber, uint64 deadline, uint256 amount) external returns (bytes32)',
  'function fund(bytes32 bountyId, uint256 amount) external',
  'function resolve(bytes32 bountyId, address recipient) external',
  'function getBounty(bytes32 bountyId) external view returns (tuple(bytes32 repoIdHash, address sponsor, address resolver, address token, uint96 amount, uint64 deadline, uint64 issueNumber, uint8 status))',
  'function computeBountyId(address sponsor, bytes32 repoIdHash, uint64 issueNumber) external pure returns (bytes32)',
  'function paused() external view returns (bool)',
  'event Resolved(bytes32 indexed bountyId, address indexed recipient, uint256 net, uint256 fee)',
  'event BountyCreated(bytes32 indexed bountyId, address indexed sponsor, bytes32 indexed repoIdHash, uint64 issueNumber, uint64 deadline, address resolver, uint256 amount)',
  'event Funded(bytes32 indexed bountyId, address indexed sponsor, uint256 amount)'
];

// Ensure refund flow fragments are always present (was missing in a prior ABI)
const ESCROW_REFUND_FRAGMENTS = [
  'function refundExpired(bytes32 bountyId) external',
  'event Refunded(bytes32 indexed bountyId, address indexed sponsor, uint256 amount)'
];

// Admin fee-related fragments
const ESCROW_FEE_FRAGMENTS = [
  'function availableFees(address token) external view returns (uint256)',
  'function totalFeesAccrued() external view returns (uint256)',
  'function totalEscrowedByToken(address token) external view returns (uint256)',
  'function feeBps() external view returns (uint16)',
  'function setFeeBps(uint16 newFeeBps) external',
  'function withdrawFees(address token, address to, uint256 amount) external',
  'function owner() external view returns (address)',
  // Token allowlist
  'function allowedTokens(address token) external view returns (bool)',
  'function setAllowedToken(address token, bool allowed) external',
  'function primaryToken() external view returns (address)',
  // Pausing
  'function pause() external',
  'function unpause() external',
  // Rescue
  'function rescueToken(address token, address to, uint256 amount) external',
  'function sweepNative(address to) external'
];

export const ABIS = {
  escrow: Array.from(new Set([...ESCROW_ABI_BASE, ...ESCROW_REFUND_FRAGMENTS, ...ESCROW_FEE_FRAGMENTS])),
  erc20: [
    'function approve(address spender, uint256 amount) external returns (bool)',
    'function allowance(address owner, address spender) external view returns (uint256)',
    'function decimals() external view returns (uint8)',
    'function symbol() external view returns (string)',
    'function balanceOf(address account) external view returns (uint256)'
  ]
};

/**
 * Build the network registry from environment variables
 * Throws clear errors for any missing or invalid configuration
 */
function buildRegistry() {
  const registry = {};
  const skippedAliases = [];
  const groups = ['mainnet', 'testnet'];

  for (const group of groups) {
    const envKey = `BLOCKCHAIN_SUPPORTED_${group.toUpperCase()}_ALIASES`;
    const aliasesStr = process.env[envKey] || '';
    const aliases = aliasesStr.split(',').map(s => s.trim()).filter(Boolean);

    for (const alias of aliases) {
      const curated = CURATED_ALIASES[alias];
      if (!curated) {
        throw new Error(`Unknown network alias "${alias}" in ${envKey}. Valid aliases: ${Object.keys(CURATED_ALIASES).join(', ')}`);
      }

      if (curated.group !== group) {
        throw new Error(`Network alias "${alias}" belongs to group "${curated.group}" but was listed in ${envKey}`);
      }

      // RPC URL: use env override or curated default
      const rpcUrl = process.env[`${alias}_RPC_URL`] || curated.rpcUrl;

      // Contracts and token: allow curated defaults (used for testnets or preconfigured mainnets).
      const allowCuratedDefaults =
        Boolean(curated.defaultContracts?.escrow) &&
        Boolean(curated.defaultToken?.address) &&
        Boolean(curated.defaultToken?.symbol) &&
        curated.defaultToken?.decimals !== undefined;
      const escrowEnv = process.env[`${alias}_ESCROW_ADDRESS`];
      const tokenEnv = process.env[`${alias}_TOKEN_ADDRESS`];
      const tokenSymbolEnv = process.env[`${alias}_TOKEN_SYMBOL`];
      const tokenDecimalsEnv = process.env[`${alias}_TOKEN_DECIMALS`];

      const escrowAddress = escrowEnv || (allowCuratedDefaults ? curated.defaultContracts?.escrow : undefined);
      if (!escrowAddress) {
        skippedAliases.push({
          alias,
          reason: `Missing required configuration ${alias}_ESCROW_ADDRESS`
        });
        continue;
      }
      if (!isAddress(escrowAddress)) {
        skippedAliases.push({
          alias,
          reason: `Invalid escrow address: ${escrowAddress}`
        });
        continue;
      }

      const tokenAddress = tokenEnv || (allowCuratedDefaults ? curated.defaultToken?.address : undefined);
      const tokenSymbol = tokenSymbolEnv || (allowCuratedDefaults ? curated.defaultToken?.symbol : undefined);
      const tokenDecimals = tokenDecimalsEnv !== undefined && tokenDecimalsEnv !== null
        ? Number(tokenDecimalsEnv)
        : (allowCuratedDefaults ? curated.defaultToken?.decimals : undefined);

      if (!tokenAddress || !tokenSymbol || tokenDecimals === undefined || tokenDecimals === null) {
        skippedAliases.push({
          alias,
          reason: `Missing token configuration. Set ${alias}_TOKEN_ADDRESS, ${alias}_TOKEN_SYMBOL, ${alias}_TOKEN_DECIMALS`
        });
        continue;
      }
      if (!isAddress(tokenAddress)) {
        skippedAliases.push({
          alias,
          reason: `Invalid token address: ${tokenAddress}`
        });
        continue;
      }
      if (typeof tokenSymbol !== 'string' || tokenSymbol.length < 2 || tokenSymbol.length > 12) {
        skippedAliases.push({
          alias,
          reason: `Invalid token symbol: ${tokenSymbol}`
        });
        continue;
      }
      if (isNaN(tokenDecimals) || tokenDecimals < 0 || tokenDecimals > 18) {
        skippedAliases.push({
          alias,
          reason: `Invalid token decimals: ${tokenDecimals} (must be 0-18)`
        });
        continue;
      }

      // Build complete network config
      registry[alias] = {
        group: curated.group,
        chainId: curated.chainId,
        chainIdHex: curated.chainIdHex,
        name: curated.name,
        rpcUrl,
        blockExplorerUrl: curated.blockExplorerUrl,
        supports1559: curated.supports1559,
        nativeCurrency: curated.nativeCurrency,
        contracts: {
          escrow: escrowAddress
        },
        token: {
          address: tokenAddress,
          symbol: tokenSymbol,
          decimals: tokenDecimals
        },
        // Include additional tokens if defined (for multi-token support)
        additionalTokens: curated.additionalTokens || []
      };
    }
  }

  // Validate at least one network is configured
  if (skippedAliases.length > 0 && !hasLoggedSkippedAliases) {
    logger.warn('[chain-registry] Skipping misconfigured network aliases:');
    for (const { alias, reason } of skippedAliases) {
      logger.warn(`  - ${alias}: ${reason}`);
    }
    hasLoggedSkippedAliases = true;
  }

  if (Object.keys(registry).length === 0) {
    // On client-side, return empty registry to prevent crashes
    // On server-side, throw error to fail fast for misconfiguration
    const isClient = typeof window !== 'undefined';
    if (isClient) {
      logger.warn('[chain-registry] No networks configured. Set BLOCKCHAIN_SUPPORTED_MAINNET_ALIASES and/or BLOCKCHAIN_SUPPORTED_TESTNET_ALIASES');
      return registry; // Return empty registry
    }
    throw new Error('No networks configured. Set BLOCKCHAIN_SUPPORTED_MAINNET_ALIASES and/or BLOCKCHAIN_SUPPORTED_TESTNET_ALIASES');
  }

  return registry;
}

// Build registry at module load time (fails fast if misconfigured on server, graceful on client)
export const REGISTRY = buildRegistry();

// Default aliases per group
const DEFAULT_MAINNET = process.env.BLOCKCHAIN_DEFAULT_MAINNET_ALIAS || '';
const DEFAULT_TESTNET = process.env.BLOCKCHAIN_DEFAULT_TESTNET_ALIAS || '';

/**
 * Get all aliases configured for a specific group
 * @param {string} group - 'mainnet' or 'testnet'
 * @returns {string[]} Array of alias names
 */
export function getAliasesForGroup(group) {
  return Object.keys(REGISTRY).filter(alias => REGISTRY[alias].group === group);
}

/**
 * Get the default alias for a group
 * @param {string} group - 'mainnet' or 'testnet'
 * @returns {string} Default alias name
 * @throws {Error} If no default configured or default not in supported list
 */
export function getDefaultAliasForGroup(group) {
  // Handle empty registry gracefully on client-side
  if (Object.keys(REGISTRY).length === 0) {
    const isClient = typeof window !== 'undefined';
    if (isClient) {
      throw new Error('Network configuration is not available. Please contact support or check your environment settings.');
    }
  }

  const defaultAlias = group === 'mainnet' ? DEFAULT_MAINNET : DEFAULT_TESTNET;
  
  if (!defaultAlias) {
    throw new Error(`No default ${group} alias configured. Set BLOCKCHAIN_DEFAULT_${group.toUpperCase()}_ALIAS`);
  }

  const aliasesInGroup = getAliasesForGroup(group);
  if (!aliasesInGroup.includes(defaultAlias)) {
    throw new Error(`Default ${group} alias "${defaultAlias}" is not in supported ${group} aliases: ${aliasesInGroup.join(', ')}`);
  }

  return defaultAlias;
}

/**
 * Get a specific network configuration by alias
 * @param {string} alias - Network alias (e.g., 'BASE_MAINNET')
 * @returns {Object} Network configuration object
 * @throws {Error} If alias is not configured
 */
export function getAlias(alias) {
  if (!alias) {
    throw new Error('Network alias is required');
  }
  
  const config = REGISTRY[alias];
  if (!config) {
    throw new Error(`Network alias "${alias}" is not configured. Available: ${Object.keys(REGISTRY).join(', ')}`);
  }
  
  return config;
}

/**
 * Get network configuration by chainId
 * @param {number} chainId - Chain ID
 * @returns {Object|null} Network configuration or null if not found
 */
export function getAliasByChainId(chainId) {
  const alias = Object.keys(REGISTRY).find(key => REGISTRY[key].chainId === chainId);
  return alias ? { alias, ...REGISTRY[alias] } : null;
}

/**
 * Format token amount for display
 * @param {string|bigint} amount - Token amount in smallest units
 * @param {string} alias - Network alias
 * @returns {string} Formatted amount
 */
export function formatTokenAmount(amount, alias) {
  const config = getAlias(alias);
  const decimals = config.token.decimals;
  const value = typeof amount === 'string' ? BigInt(amount) : amount;
  const divisor = BigInt(10 ** decimals);
  const integerPart = value / divisor;
  const fractionalPart = value % divisor;
  
  if (fractionalPart === 0n) {
    return integerPart.toString();
  }
  
  const fractionalStr = fractionalPart.toString().padStart(decimals, '0');
  const precision = decimals === 18 ? 4 : 2;
  const trimmed = fractionalStr.slice(0, precision).replace(/0+$/, '');
  
  return trimmed ? `${integerPart}.${trimmed}` : integerPart.toString();
}
