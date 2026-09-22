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
 * Initialize legacy blockchain clients (prefers mainnet, falls back to testnet).
 */
export function initBlockchain() {
  try {
    // Try mainnet first, fall back to testnet
    let defaultAlias;
    try {
      defaultAlias = getDefaultAliasForGroup('mainnet');
    } catch {
      defaultAlias = getDefaultAliasForGroup('testnet');
    }
    
    const clients = getNetworkClients(defaultAlias);

    provider = clients.provider;
    resolverWallet = clients.wallet;
    escrowContract = clients.escrowContract;
    tokenContract = clients.tokenContract;

    logger.info(`Blockchain initialized with ${defaultAlias}`);
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
    token: bounty.token, // New field in contracts/current/BountyEscrow.sol
    amount: bounty.amount.toString(),
    deadline: Number(bounty.deadline),
    issueNumber: Number(bounty.issueNumber),
    status: statusNumber,
    statusString: contractStatusToDb(statusNumber),
    exists: statusNumber !== 0
  };
}

/**
 * Reads a bounty's on-chain status for pre-send verification.
 * @param {string} bountyId
 * @param {string} alias
 * @returns {Promise<string|null>} 'open'|'resolved'|'refunded', or null when
 *   the bounty does not exist on-chain. Throws on RPC/config errors — the
 *   payout guard treats a throw as "unknown" and fails open toward liveness.
 */
export async function readBountyOnchainStatus(bountyId, alias) {
  const info = await getBountyFromContract(bountyId, alias);
  return info.statusString || null;
}

/**
 * Reads a bounty's on-chain status and, when resolved, who it was paid to.
 *
 * "Resolved on-chain" is not "resolved to this claimant": two PRs can claim
 * one bounty, and the escrow struct does not keep the recipient. The
 * `Resolved` event does, so the guard compares it before marking a claim
 * paid. The event lookup is best-effort: a failed log query yields a null
 * recipient, which the guard treats as unverified (never as a match).
 *
 * @param {string} bountyId
 * @param {string} alias
 * @returns {Promise<{status: string|null, recipient: string|null, txHash: string|null}>}
 *   Throws only when the status read itself fails.
 */
export async function readBountyOnchainResolution(bountyId, alias) {
  const status = await readBountyOnchainStatus(bountyId, alias);
  if (status !== 'resolved') {
    return { status, recipient: null, txHash: null };
  }
  try {
    const { escrowContract } = getNetworkClients(alias);
    const logs = await escrowContract.queryFilter(escrowContract.filters.Resolved(bountyId));
    const last = logs[logs.length - 1];
    if (!last) return { status, recipient: null, txHash: null };
    return {
      status,
      recipient: last.args?.recipient ?? null,
      txHash: last.transactionHash ?? null
    };
  } catch (error) {
    logger.warn(`Resolved event lookup failed on ${alias}:`, error.message);
    return { status, recipient: null, txHash: null };
  }
}

// How long a payout waits for its receipt before handing the (already
// broadcast) transaction back as unconfirmed. Kept under the route's
// `maxDuration` so the guard, not the platform, decides what happens to the
// lease when the chain is slow.
export const PAYOUT_CONFIRMATION_TIMEOUT_MS = 45 * 1000;

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

    // The transaction is on the network from here. A receipt that does not
    // arrive in time is not a failure to retry (that would double-send); it
    // is a broadcast whose outcome the chain will settle. Report it as such.
    let receipt;
    try {
      receipt = await tx.wait(1, PAYOUT_CONFIRMATION_TIMEOUT_MS);
    } catch (error) {
      if (error?.code === 'TIMEOUT') {
        logger.warn(`Bounty resolve unconfirmed on ${alias}: ${bountyId.slice(0, 10)}... -> ${tx.hash}`);
        return {
          success: false,
          unconfirmed: true,
          txHash: tx.hash,
          error: `Transaction ${tx.hash} broadcast but not confirmed within ${PAYOUT_CONFIRMATION_TIMEOUT_MS / 1000}s`
        };
      }
      throw error;
    }
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
