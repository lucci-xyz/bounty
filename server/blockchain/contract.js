import { logger } from '@/lib/logger';
import { ethers } from 'ethers';
import { CONFIG } from '../config.js';
import { REGISTRY, ABIS, getDefaultAliasForGroup } from '../../config/chain-registry.js';
import { validateAddress, validateBytes32 } from './validation.js';
import { contractStatusToDb } from '@/lib/status';

/**
 * Get the private key for a specific network alias.
 * @param {string} alias
 * @returns {string} private key
 */
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
 * Create blockchain clients for a network alias.
 * @param {string} alias
 * @returns {object} { network, provider, wallet, escrowContract, tokenContract }
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
    tokenContract,
  };
}

// Legacy globals for backward compatibility (default: testnet)
let provider;
let resolverWallet;
let escrowContract;
let tokenContract;

/**
 * Initialize legacy blockchain clients (using default testnet).
 */
export function initBlockchain() {
  try {
    const defaultTestnetAlias = getDefaultAliasForGroup('testnet');
    const clients = getNetworkClients(defaultTestnetAlias);

    provider = clients.provider;
    resolverWallet = clients.wallet;
    escrowContract = clients.escrowContract;
    tokenContract = clients.tokenContract;

    logger.info(`Blockchain initialized with ${defaultTestnetAlias}`);
  } catch (error) {
    logger.warn('Could not initialize default blockchain clients:', error.message);
  }
}

/**
 * Get the default provider.
 * @returns {ethers.Provider}
 */
export function getProvider() {
  if (!provider) throw new Error('Blockchain not initialized');
  return provider;
}

/**
 * Compute bounty ID (legacy - uses default testnet).
 * @param {string} sponsorAddress
 * @param {string} repoIdHash
 * @param {number} issueNumber
 * @returns {Promise<string>}
 */
export async function computeBountyId(sponsorAddress, repoIdHash, issueNumber) {
  if (!escrowContract) throw new Error('Blockchain not initialized');
  return await escrowContract.computeBountyId(sponsorAddress, repoIdHash, issueNumber);
}

/**
 * Compute bounty ID on a specific network.
 * @param {string} sponsorAddress
 * @param {string} repoIdHash
 * @param {number} issueNumber
 * @param {string} alias
 * @returns {Promise<string>}
 */
export async function computeBountyIdOnNetwork(sponsorAddress, repoIdHash, issueNumber, alias) {
  const { escrowContract } = getNetworkClients(alias);
  return await escrowContract.computeBountyId(sponsorAddress, repoIdHash, issueNumber);
}

/**
 * Get bounty information from contract on a given network.
 * @param {string} bountyId
 * @param {string} alias
 * @returns {Promise<object>}
 */
export async function getBountyFromContract(bountyId, alias) {
  const { escrowContract, provider } = getNetworkClients(alias);
  const contractCode = await provider.getCode(escrowContract.target);

  if (contractCode === '0x') {
    throw new Error(
      `Escrow contract not deployed on ${alias} at ${escrowContract.target}. Check chain registry and environment configuration.`
    );
  }

  const bounty = await escrowContract.getBounty(bountyId);
  const statusNumber = Number(bounty.status);
  return {
    repoIdHash: bounty.repoIdHash,
    sponsor: bounty.sponsor,
    resolver: bounty.resolver,
    amount: bounty.amount.toString(),
    deadline: Number(bounty.deadline),
    issueNumber: Number(bounty.issueNumber),
    status: statusNumber,
    statusString: contractStatusToDb(statusNumber),
    exists: statusNumber !== 0
  };
}

/**
 * Resolve a bounty (legacy - uses default testnet).
 * @param {string} bountyId
 * @param {string} recipientAddress
 * @returns {Promise<object>} Transaction result.
 */
export async function resolveBounty(bountyId, recipientAddress) {
  if (!escrowContract) throw new Error('Blockchain not initialized');
  try {
    bountyId = validateBytes32(bountyId, 'bountyId');
    recipientAddress = validateAddress(recipientAddress, 'recipientAddress');
    const tx = await escrowContract.resolve(bountyId, recipientAddress);
    const receipt = await tx.wait();
    logger.info(`Bounty resolved: ${bountyId.slice(0, 10)}... -> ${receipt.hash}`);
    return {
      success: true,
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed.toString(),
    };
  } catch (error) {
    logger.error('Error resolving bounty:', error.message);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Resolve a bounty on a specific network.
 * @param {string} bountyId
 * @param {string} recipientAddress
 * @param {string} alias
 * @returns {Promise<object>} Transaction result.
 */
export async function resolveBountyOnNetwork(bountyId, recipientAddress, alias) {
  try {
    bountyId = validateBytes32(bountyId, 'bountyId');
    recipientAddress = validateAddress(recipientAddress, 'recipientAddress');
    const { escrowContract, provider, network } = getNetworkClients(alias);

    let txOverrides = {};
    if (!network.supports1559) {
      const gasPrice = await provider.send('eth_gasPrice', []);
      txOverrides = {
        type: 0,
        gasPrice: BigInt(gasPrice),
      };
    }

    const tx = await escrowContract.resolve(bountyId, recipientAddress, txOverrides);
    const receipt = await tx.wait();
    logger.info(`Bounty resolved on ${alias}: ${bountyId.slice(0, 10)}... -> ${receipt.hash}`);
    return {
      success: true,
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed.toString(),
    };
  } catch (error) {
    logger.error(`Error resolving bounty on ${alias}:`, error.message);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Refund an expired bounty on a specific network.
 * @param {string} bountyId
 * @param {string} alias
 * @returns {Promise<object>} Transaction result.
 */
export async function refundExpiredOnNetwork(bountyId, alias) {
  try {
    bountyId = validateBytes32(bountyId, 'bountyId');
    const { escrowContract, provider, network } = getNetworkClients(alias);

    let txOverrides = {};
    if (!network.supports1559) {
      const gasPrice = await provider.send('eth_gasPrice', []);
      txOverrides = {
        type: 0,
        gasPrice: BigInt(gasPrice),
      };
    }

    const tx = await escrowContract.refundExpired(bountyId, txOverrides);
    const receipt = await tx.wait();
    logger.info(`Custodial refund on ${alias}: ${bountyId.slice(0, 10)}... -> ${receipt.hash}`);
    return {
      success: true,
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed.toString(),
    };
  } catch (error) {
    logger.error(`Error refunding bounty on ${alias}:`, error.message);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Format a token amount for display.
 * @param {string|bigint} amount
 * @param {number} decimals
 * @returns {string}
 */
export function formatTokenAmount(amount, decimals) {
  return ethers.formatUnits(amount, decimals);
}

/**
 * Parse a token amount from user input.
 * @param {string} amount
 * @param {number} decimals
 * @returns {bigint}
 */
export function parseTokenAmount(amount, decimals) {
  return ethers.parseUnits(amount, decimals);
}

/**
 * Get token symbol and decimals for a network.
 * @param {string} alias
 * @returns {Promise<object>} { symbol, decimals }
 */
export async function getTokenInfo(alias) {
  const { tokenContract } = getNetworkClients(alias);
  const [symbol, decimals] = await Promise.all([
    tokenContract.symbol(),
    tokenContract.decimals(),
  ]);
  return { symbol, decimals: Number(decimals) };
}

/**
 * Create a repo ID hash from a GitHub repo ID.
 * @param {number} repoId
 * @returns {string} bytes32 hex string
 */
export function createRepoIdHash(repoId) {
  const hex = '0x' + repoId.toString(16).padStart(64, '0');
  return hex;
}

// Export legacy globals for backward compatibility
export {
  provider,
  resolverWallet,
  escrowContract,
  tokenContract,
};
