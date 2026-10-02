import { logger } from '@/lib/logger';
import { ethers } from 'ethers';
import { CONFIG } from '../config.js';
import { REGISTRY, ABIS, getDefaultAliasForGroup } from '../../config/chain-registry.js';
import { validateAddress, validateBytes32 } from './validation.js';
import { contractStatusToDb } from '@/lib/status';
import { findResolvedEvent, decodeRevert, isDefinitiveBroadcastRejection } from './payoutChain.js';

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
 * paid.
 *
 * When the claim carries a pinned transaction hash (every payout pins its
 * hash at broadcast), that one receipt is checked first: a bounded, exact
 * lookup. Only without a usable pin does this fall back to an event scan,
 * which some RPCs reject for unbounded ranges. Any lookup failure yields a
 * null recipient, which the guard treats as unverified (never as a match).
 *
 * @param {string} bountyId
 * @param {string} alias
 * @param {object} [options]
 * @param {string|null} [options.txHash] - hash pinned to the claim, if any
 * When the bounty is still open and the claim's pinned transaction is in the
 * mempool, `pinnedPending` is true so the guard waits rather than queueing a
 * second send that can only revert.
 *
 * @returns {Promise<{status: string|null, recipient: string|null, txHash: string|null, pinnedPending: boolean}>}
 *   Throws only when the status read itself fails.
 */
export async function readBountyOnchainResolution(bountyId, alias, { txHash = null } = {}) {
  const status = await readBountyOnchainStatus(bountyId, alias);
  const unverified = { status, recipient: null, txHash: null, pinnedPending: false };
  const { escrowContract, provider } = getNetworkClients(alias);

  if (status === 'open') {
    // A pinned send still sitting in the mempool will either resolve this
    // bounty or revert. A second send from the same resolver queues behind
    // it on nonce and can only revert, so the guard waits instead.
    if (!txHash) return unverified;
    try {
      const pending = await provider.getTransaction(txHash);
      return { ...unverified, pinnedPending: Boolean(pending) && pending.blockNumber == null };
    } catch (error) {
      logger.warn(`Pinned payout lookup failed on ${alias}:`, error.message);
      return unverified;
    }
  }
  if (status !== 'resolved') return unverified;

  if (txHash) {
    try {
      const receipt = await provider.getTransactionReceipt(txHash);
      const found = findResolvedEvent(receipt, {
        iface: escrowContract.interface,
        escrowAddress: escrowContract.target,
        bountyId
      });
      if (found) return { ...unverified, ...found };
    } catch (error) {
      logger.warn(`Pinned payout receipt lookup failed on ${alias}:`, error.message);
    }
  }

  try {
    const logs = await escrowContract.queryFilter(escrowContract.filters.Resolved(bountyId));
    const last = logs[logs.length - 1];
    if (!last) return unverified;
    return {
      ...unverified,
      recipient: last.args?.recipient ?? null,
      txHash: last.transactionHash ?? null
    };
  } catch (error) {
    logger.warn(`Resolved event lookup failed on ${alias}:`, error.message);
    return unverified;
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
 *
 * The transaction is signed first and broadcast second, mirroring ethers'
 * own sendTransaction. Its hash is therefore known, and handed to `onTxHash`,
 * before anything goes on the wire: a lost broadcast response or a process
 * killed mid-wait cannot take the only record of the send with it.
 *
 * After signing, only two outcomes are definitive: the node refusing this
 * exact transaction (it can never mine), or a mined receipt. Everything else
 * comes back `unconfirmed` with the hash, never as a failure the caller would
 * retry into a second send.
 *
 * @param {string} bountyId
 * @param {string} recipientAddress
 * @param {string} alias
 * @param {object} [options]
 * @param {(txHash: string) => Promise<void>} [options.onTxHash] - called with
 *   the signed transaction's hash, before broadcast
 * @returns {Promise<object>} Transaction result.
 */
export async function resolveBountyOnNetwork(bountyId, recipientAddress, alias, { onTxHash } = {}) {
  let iface = null;
  try {
    bountyId = validateBytes32(bountyId, 'bountyId');
    recipientAddress = validateAddress(recipientAddress, 'recipientAddress');
    const { escrowContract, provider, wallet, network } = getNetworkClients(alias);
    iface = escrowContract.interface;

    let txOverrides = {};
    if (!network.supports1559) {
      const gasPrice = await provider.send('eth_gasPrice', []);
      txOverrides = {
        type: 0,
        gasPrice: BigInt(gasPrice),
      };
    }

    // Populate (nonce, gas estimate, fees) and sign. An escrow revert such as
    // NotOpen surfaces here, during gas estimation, before anything is sent.
    const request = await escrowContract.resolve.populateTransaction(bountyId, recipientAddress, txOverrides);
    const populated = await wallet.populateTransaction(request);
    delete populated.from;
    const signed = await wallet.signTransaction(ethers.Transaction.from(populated));
    const txHash = ethers.Transaction.from(signed).hash;

    if (onTxHash) {
      try {
        await onTxHash(txHash);
      } catch (error) {
        logger.error(`Could not record payout ${txHash} on ${alias}:`, error.message);
      }
    }

    const unconfirmed = (reason) => {
      logger.warn(`Bounty resolve unconfirmed on ${alias}: ${bountyId.slice(0, 10)}... -> ${txHash} (${reason})`);
      return {
        success: false,
        unconfirmed: true,
        txHash,
        error: `Transaction ${txHash} sent but not confirmed within ${PAYOUT_CONFIRMATION_TIMEOUT_MS / 1000}s`
      };
    };

    let tx;
    try {
      tx = await provider.broadcastTransaction(signed);
    } catch (error) {
      if (isDefinitiveBroadcastRejection(error)) throw error;
      return unconfirmed(error?.code || 'broadcast response lost');
    }

    let receipt;
    try {
      receipt = await tx.wait(1, PAYOUT_CONFIRMATION_TIMEOUT_MS);
    } catch (error) {
      // Mined and reverted: definitive. Anything else may still mine.
      if (error?.code === 'CALL_EXCEPTION' && error?.receipt) throw error;
      return unconfirmed(error?.code || 'unknown');
    }
    logger.info(`Bounty resolved on ${alias}: ${bountyId.slice(0, 10)}... -> ${receipt.hash}`);
    return {
      success: true,
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed.toString(),
    };
  } catch (error) {
    const revert = decodeRevert(error, iface);
    const message = revert ? `Escrow reverted: ${revert}` : error.message;
    logger.error(`Error resolving bounty on ${alias}:`, message);
    return {
      success: false,
      error: message,
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
