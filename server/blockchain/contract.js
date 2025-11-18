import { ethers } from 'ethers';
import { CONFIG } from '../config.js';
import { REGISTRY, ABIS, getDefaultAliasForGroup } from '../../config/chain-registry.js';
import { validateAddress, validateBytes32 } from './validation.js';

function getPrivateKeyForAlias(alias) {
  const aliasWallet = CONFIG.blockchain.walletsByAlias?.[alias];
  if (aliasWallet?.privateKey) {
    return aliasWallet.privateKey;
  }
  throw new Error(
    `No private key configured for network ${alias}. Set ${alias}_OWNER_WALLET and ${alias}_OWNER_PRIVATE_KEY.`
  );
}

/**
 * Get network clients for a specific alias
 * @param {string} alias - Network alias (e.g., 'BASE_MAINNET')
 * @returns {Object} Network clients and config
 */
function getNetworkClients(alias) {
  const network = REGISTRY[alias];
  if (!network) {
    throw new Error(`Unknown network alias: ${alias}. Available: ${Object.keys(REGISTRY).join(', ')}`);
  }

  const provider = new ethers.JsonRpcProvider(network.rpcUrl);
  const privateKey = getPrivateKeyForAlias(alias);
  const wallet = new ethers.Wallet(privateKey, provider);
  const escrowContract = new ethers.Contract(network.contracts.escrow, ABIS.escrow, wallet);
  const tokenContract = new ethers.Contract(network.token.address, ABIS.erc20, provider);

  return {
    network,
    provider,
    wallet,
    escrowContract,
    tokenContract
  };
}

// Legacy global clients (kept for backward compatibility, use default testnet)
let provider;
let resolverWallet;
let escrowContract;
let tokenContract;

/**
 * Initialize blockchain connection (legacy - uses default testnet)
 */
export function initBlockchain() {
  try {
    const defaultTestnetAlias = getDefaultAliasForGroup('testnet');
    const clients = getNetworkClients(defaultTestnetAlias);
    
    provider = clients.provider;
    resolverWallet = clients.wallet;
    escrowContract = clients.escrowContract;
    tokenContract = clients.tokenContract;
    
    console.log(`Blockchain initialized with ${defaultTestnetAlias}`);
  } catch (error) {
    console.warn('Could not initialize default blockchain clients:', error.message);
  }
}

/**
 * Get provider instance (legacy)
 */
export function getProvider() {
  if (!provider) throw new Error('Blockchain not initialized');
  return provider;
}

/**
 * Compute bountyId from contract parameters (legacy - uses default testnet)
 */
export async function computeBountyId(sponsorAddress, repoIdHash, issueNumber) {
  if (!escrowContract) throw new Error('Blockchain not initialized');
  return await escrowContract.computeBountyId(sponsorAddress, repoIdHash, issueNumber);
}

/**
 * Compute bountyId on a specific network
 */
export async function computeBountyIdOnNetwork(sponsorAddress, repoIdHash, issueNumber, alias) {
  const { escrowContract } = getNetworkClients(alias);
  return await escrowContract.computeBountyId(sponsorAddress, repoIdHash, issueNumber);
}

/**
 * Get bounty details from contract on a specific network
 */
export async function getBountyFromContract(bountyId, alias) {
  const { escrowContract } = getNetworkClients(alias);
  const bounty = await escrowContract.getBounty(bountyId);
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
 * Resolve a bounty by calling the contract (legacy - uses default testnet)
 * @param {string} bountyId - bytes32 bounty ID
 * @param {string} recipientAddress - Recipient wallet address
 * @returns {Object} Transaction receipt
 */
export async function resolveBounty(bountyId, recipientAddress) {
  if (!escrowContract) throw new Error('Blockchain not initialized');
  
  try {
    // Validate inputs
    bountyId = validateBytes32(bountyId, 'bountyId');
    recipientAddress = validateAddress(recipientAddress, 'recipientAddress');
    
    const tx = await escrowContract.resolve(bountyId, recipientAddress);
    const receipt = await tx.wait();
    
    console.log(`Bounty resolved: ${bountyId.slice(0, 10)}... -> ${receipt.hash}`);
    
    return {
      success: true,
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed.toString()
    };
  } catch (error) {
    console.error('Error resolving bounty:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Resolve a bounty on a specific network
 * @param {string} bountyId - bytes32 bounty ID
 * @param {string} recipientAddress - Recipient wallet address
 * @param {string} alias - Network alias
 * @returns {Object} Transaction receipt
 */
export async function resolveBountyOnNetwork(bountyId, recipientAddress, alias) {
  try {
    // Validate inputs
    bountyId = validateBytes32(bountyId, 'bountyId');
    recipientAddress = validateAddress(recipientAddress, 'recipientAddress');
    
    const { escrowContract, provider, network } = getNetworkClients(alias);
    
    // For networks that don't support EIP-1559, use legacy transactions
    let txOverrides = {};
    if (!network.supports1559) {
      const gasPrice = await provider.send('eth_gasPrice', []);
      txOverrides = {
        type: 0,
        gasPrice: BigInt(gasPrice)
      };
    }
    
    const tx = await escrowContract.resolve(bountyId, recipientAddress, txOverrides);
    const receipt = await tx.wait();
    
    console.log(`Bounty resolved on ${alias}: ${bountyId.slice(0, 10)}... -> ${receipt.hash}`);
    
    return { 
      success: true, 
      txHash: receipt.hash, 
      blockNumber: receipt.blockNumber, 
      gasUsed: receipt.gasUsed.toString() 
    };
  } catch (error) {
    console.error(`Error resolving bounty on ${alias}:`, error.message);
    return { 
      success: false, 
      error: error.message 
    };
  }
}

/**
 * Format token amount for display
 * @param {string|bigint} amount - Token amount in smallest units
 * @param {number} decimals - Token decimals
 * @returns {string} Formatted amount
 */
export function formatTokenAmount(amount, decimals) {
  return ethers.formatUnits(amount, decimals);
}

/**
 * Parse token amount from user input
 * @param {string} amount - Human-readable amount
 * @param {number} decimals - Token decimals
 * @returns {bigint} Amount in smallest units
 */
export function parseTokenAmount(amount, decimals) {
  return ethers.parseUnits(amount, decimals);
}

/**
 * Get token info from contract
 * @param {string} alias - Network alias
 * @returns {Object} Token symbol and decimals
 */
export async function getTokenInfo(alias) {
  const { tokenContract } = getNetworkClients(alias);
  const [symbol, decimals] = await Promise.all([
    tokenContract.symbol(),
    tokenContract.decimals()
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

// Export legacy globals for backward compatibility
export {
  provider,
  resolverWallet,
  escrowContract,
  tokenContract
};
