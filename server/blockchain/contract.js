import { ethers } from 'ethers';
import { CONFIG } from '../config.js';

// ABI excerpts for the functions we need
const ESCROW_ABI = [
  'function resolve(bytes32 bountyId, address recipient) external',
  'function getBounty(bytes32 bountyId) external view returns (tuple(bytes32 repoIdHash, address sponsor, address resolver, uint96 amount, uint64 deadline, uint64 issueNumber, uint8 status))',
  'function computeBountyId(address sponsor, bytes32 repoIdHash, uint64 issueNumber) external pure returns (bytes32)',
  'event Resolved(bytes32 indexed bountyId, address indexed recipient, uint256 net, uint256 fee)',
  'event BountyCreated(bytes32 indexed bountyId, address indexed sponsor, bytes32 indexed repoIdHash, uint64 issueNumber, uint64 deadline, address resolver, uint256 amount)'
];

const ERC20_ABI = [
  'function decimals() external view returns (uint8)',
  'function symbol() external view returns (string)',
  'function balanceOf(address account) external view returns (uint256)'
];

let provider;
let resolverWallet;
let escrowContract;
let usdcContract;

// Network-aware configuration for server-side actions
const NETWORK_CONFIG = {
  BASE_SEPOLIA: {
    rpcUrl: CONFIG.blockchain.rpcUrl,
    escrow: CONFIG.blockchain.escrowContract,
    token: CONFIG.blockchain.usdcContract,
    tokenDecimals: 6,
  },
  MEZO_TESTNET: {
    // Use official Mezo RPC for server-side to avoid dRPC batch request limits
    rpcUrl: process.env.MEZO_RPC_URL || 'https://rpc.test.mezo.org',
    escrow: process.env.MEZO_ESCROW_CONTRACT || '0xA6fe4832D8eBdB3AAfca86438a813BBB0Bd4c6A3',
    token: CONFIG.blockchain.musdContract || '0x118917a40FAF1CD7a13dB0Ef56C86De7973Ac503',
    tokenDecimals: 18,
  }
};

function getNetworkClients(network = 'BASE_SEPOLIA') {
  const net = NETWORK_CONFIG[network] || NETWORK_CONFIG.BASE_SEPOLIA;
  const netProvider = new ethers.JsonRpcProvider(net.rpcUrl);
  const netWallet = new ethers.Wallet(CONFIG.blockchain.resolverPrivateKey, netProvider);
  const netEscrow = new ethers.Contract(net.escrow, ESCROW_ABI, netWallet);
  const netToken = new ethers.Contract(net.token, ERC20_ABI, netProvider);
  return { net, netProvider, netWallet, netEscrow, netToken };
}

/**
 * Initialize blockchain connection
 */
export function initBlockchain() {
  // Initialize defaults for backward compatibility (Base Sepolia)
  provider = new ethers.JsonRpcProvider(CONFIG.blockchain.rpcUrl);
  resolverWallet = new ethers.Wallet(CONFIG.blockchain.resolverPrivateKey, provider);
  escrowContract = new ethers.Contract(CONFIG.blockchain.escrowContract, ESCROW_ABI, resolverWallet);
  usdcContract = new ethers.Contract(CONFIG.blockchain.usdcContract, ERC20_ABI, provider);
  console.log('✅ Blockchain initialized');
  console.log(`   Resolver address: ${resolverWallet.address}`);
}

/**
 * Get provider instance
 */
export function getProvider() {
  if (!provider) throw new Error('Blockchain not initialized');
  return provider;
}

/**
 * Compute bountyId from contract parameters
 */
export async function computeBountyId(sponsorAddress, repoIdHash, issueNumber) {
  return await escrowContract.computeBountyId(sponsorAddress, repoIdHash, issueNumber);
}

export async function computeBountyIdOnNetwork(sponsorAddress, repoIdHash, issueNumber, network = 'BASE_SEPOLIA') {
  const { netEscrow } = getNetworkClients(network);
  return await netEscrow.computeBountyId(sponsorAddress, repoIdHash, issueNumber);
}

/**
 * Get bounty details from contract
 */
export async function getBountyFromContract(bountyId, network = 'BASE_SEPOLIA') {
  const { netEscrow } = getNetworkClients(network);
  const bounty = await netEscrow.getBounty(bountyId);
  return {
    repoIdHash: bounty.repoIdHash,
    sponsor: bounty.sponsor,
    resolver: bounty.resolver,
    amount: bounty.amount.toString(),
    deadline: Number(bounty.deadline),
    issueNumber: Number(bounty.issueNumber),
    status: Number(bounty.status) // 0=None, 1=Open, 2=Resolved, 3=Refunded, 4=Canceled
  };
}

/**
 * Resolve a bounty by calling the contract
 * @param {string} bountyId - bytes32 bounty ID
 * @param {string} recipientAddress - Recipient wallet address
 * @returns {Object} Transaction receipt
 */
export async function resolveBounty(bountyId, recipientAddress) {
  try {
    console.log(`🔄 Resolving bounty ${bountyId} to ${recipientAddress}`);
    
    // Default network is BASE_SEPOLIA which supports EIP-1559, no overrides needed
    const tx = await escrowContract.resolve(bountyId, recipientAddress);
    console.log(`   Transaction sent: ${tx.hash}`);
    
    // Wait for confirmation
    const receipt = await tx.wait();
    console.log(`✅ Bounty resolved! Gas used: ${receipt.gasUsed.toString()}`);
    
    return {
      success: true,
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed.toString()
    };
  } catch (error) {
    console.error('❌ Error resolving bounty:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

export async function resolveBountyOnNetwork(bountyId, recipientAddress, network = 'BASE_SEPOLIA') {
  try {
    const { netEscrow, netProvider } = getNetworkClients(network);
    console.log(`🔄 Resolving bounty ${bountyId} to ${recipientAddress} on ${network}`);
    
    // Mezo testnet doesn't support EIP-1559, use legacy transactions
    let txOverrides = {};
    if (network === 'MEZO_TESTNET') {
      // Call eth_gasPrice directly to avoid batched getFeeData() which exceeds dRPC free tier limits
      const gasPrice = await netProvider.send('eth_gasPrice', []);
      txOverrides = {
        type: 0, // Legacy transaction
        gasPrice: BigInt(gasPrice)
      };
      console.log(`   Using legacy transaction with gasPrice: ${ethers.formatUnits(gasPrice, 'gwei')} gwei`);
    }
    
    const tx = await netEscrow.resolve(bountyId, recipientAddress, txOverrides);
    console.log(`   Transaction sent: ${tx.hash}`);
    const receipt = await tx.wait();
    console.log(`✅ Bounty resolved on ${network}! Gas used: ${receipt.gasUsed.toString()}`);
    return { success: true, txHash: receipt.hash, blockNumber: receipt.blockNumber, gasUsed: receipt.gasUsed.toString() };
  } catch (error) {
    console.error(`❌ Error resolving bounty on ${network}:`, error);
    return { success: false, error: error.message };
  }
}

/**
 * Format USDC amount for display (assuming 6 decimals)
 */
export function formatUSDC(amount) {
  return ethers.formatUnits(amount, 6);
}

/**
 * Parse USDC amount from user input
 */
export function parseUSDC(amount) {
  return ethers.parseUnits(amount, 6);
}

/**
 * Get USDC token info
 */
export async function getUSDCInfo() {
  const [symbol, decimals] = await Promise.all([
    usdcContract.symbol(),
    usdcContract.decimals()
  ]);
  return { symbol, decimals: Number(decimals) };
}

/**
 * Create a repoIdHash from repository info
 * @param {number} repoId - GitHub repository ID
 * @returns {string} bytes32 hash
 */
export function createRepoIdHash(repoId) {
  // Use GitHub repo ID as a simple hash (pad to bytes32)
  const hex = '0x' + repoId.toString(16).padStart(64, '0');
  return hex;
}

export {
  provider,
  resolverWallet,
  escrowContract,
  usdcContract
};

