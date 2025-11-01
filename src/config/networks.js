// Network and token configuration for BountyPay
// Supports Base Sepolia (USDC) and Mezo Testnet (MUSD)
//
// Available Mezo Testnet RPC endpoints (Chain ID 31611):
// - https://rpc.test.mezo.org (Official, may have reliability issues)
// - https://mezo-testnet.drpc.org (dRPC - default, reliable)
// - https://testnet-rpc.lavenderfive.com:443/mezo/ (Lavender.Five alternative)
//
// Note: Boar Network (https://rpc-http.mezo.boar.network) is ONLY for Mainnet (31612)

export const NETWORKS = {
  BASE_SEPOLIA: {
    chainId: 84532,
    chainIdHex: '0x14a34',
    name: 'Base Sepolia',
    rpcUrl: 'https://sepolia.base.org',
    blockExplorerUrl: 'https://sepolia.basescan.org',
    nativeCurrency: {
      name: 'ETH',
      symbol: 'ETH',
      decimals: 18
    }
  },
  MEZO_TESTNET: {
    chainId: 31611,
    chainIdHex: '0x7b7b',
    name: 'Mezo Testnet',
    rpcUrl: (import.meta.env && import.meta.env.VITE_MEZO_RPC_URL) || 'https://mezo-testnet.drpc.org' || 'https://rpc.test.mezo.org' ,
    blockExplorerUrl: 'https://explorer.test.mezo.org',
    nativeCurrency: {
      name: 'Bitcoin',
      symbol: 'BTC',
      decimals: 18
    }
  }
};

export const CONTRACTS = {
  BASE_SEPOLIA: {
    escrow: '0xb30283b5412B89d8B8dE3C6614aE2754a4545aFD',
    feeVault: '0xA6fe4832D8eBdB3AAfca86438a813BBB0Bd4c6A3',
    token: '0x036CbD53842c5426634e7929541eC2318f3dCF7e', // USDC
    tokenSymbol: 'USDC',
    tokenDecimals: 6
  },
  MEZO_TESTNET: {
    escrow: '0xA6fe4832D8eBdB3AAfca86438a813BBB0Bd4c6A3',
    feeVault: '0xa8Fc9DC3383E9E64FF9F7552a5A6B25885e5b094',
    token: '0x118917a40FAF1CD7a13dB0Ef56C86De7973Ac503', // MUSD
    tokenSymbol: 'MUSD',
    tokenDecimals: 18
  }
};

export const ESCROW_ABI = [
  'function createBounty(address resolver, bytes32 repoIdHash, uint64 issueNumber, uint64 deadline, uint256 amount) external returns (bytes32)',
];

export const ERC20_ABI = [
  'function approve(address spender, uint256 amount) external returns (bool)',
  'function allowance(address owner, address spender) external view returns (uint256)'
];

// Helper function to get network config by chain ID
export function getNetworkConfig(chainId) {
  if (chainId === NETWORKS.BASE_SEPOLIA.chainId) {
    return { network: NETWORKS.BASE_SEPOLIA, contracts: CONTRACTS.BASE_SEPOLIA };
  }
  if (chainId === NETWORKS.MEZO_TESTNET.chainId) {
    return { network: NETWORKS.MEZO_TESTNET, contracts: CONTRACTS.MEZO_TESTNET };
  }
  return null;
}

// Helper to format amounts based on token decimals
export function formatTokenAmount(amount, networkKey) {
  const decimals = CONTRACTS[networkKey].tokenDecimals;
  return parseFloat(amount).toFixed(decimals === 18 ? 4 : 2);
}

