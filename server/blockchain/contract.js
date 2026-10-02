import { logger } from '@/lib/logger';
import { ethers } from 'ethers';
import { CONFIG } from '../config.js';
import { REGISTRY, ABIS } from '../../config/chain-registry.js';
import { validateAddress, validateBytes32 } from './validation.js';
import { contractStatusToDb } from '@/lib/status';
import {
  findResolvedEvent,
  findRefundedEvent,
  decodeRevert,
  isDefinitiveBroadcastRejection,
  isNonceContention
} from './payoutChain.js';

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

// One set of clients per network alias. Building a fresh JsonRpcProvider on
// every call meant a network-detection round trip (eth_chainId) before each
// read or send, inside a payout budget measured in seconds. The registry's
// chainId is authoritative, so the network is pinned rather than detected.
const clientsByAlias = new Map();

/**
 * Get blockchain clients for a network alias.
 * @param {string} alias
 * @returns {object} { network, provider, wallet, escrowContract }
 */
function getNetworkClients(alias) {
  const cached = clientsByAlias.get(alias);
  if (cached) return cached;

  const network = REGISTRY[alias];
  if (!network) {
    throw new Error(`Unknown network alias: ${alias}. Available: ${Object.keys(REGISTRY).join(', ')}`);
  }
  const provider = new ethers.JsonRpcProvider(network.rpcUrl, network.chainId, { staticNetwork: true });
  const privateKey = getPrivateKeyForAlias(alias);
  const wallet = new ethers.Wallet(privateKey, provider);
  const escrowContract = new ethers.Contract(network.contracts.escrow, ABIS.escrow, wallet);

  const clients = { network, provider, wallet, escrowContract };
  clientsByAlias.set(alias, clients);
  return clients;
}

/**
 * Compute bounty ID on a specific network.
 * @param {string} sponsorAddress
 * @param {string} repoIdHash
 * @param {number} issueNumber
 * @param {string} alias
 * @returns {Promise<string>}
 */
export function computeBountyIdOnNetwork(sponsorAddress, repoIdHash, issueNumber, alias) {
  const { escrowContract } = getNetworkClients(alias);
  return escrowContract.computeBountyId(sponsorAddress, repoIdHash, issueNumber);
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

/**
 * Verifies that a transaction refunded this bounty on-chain.
 * @param {string} bountyId
 * @param {string} alias
 * @param {string} txHash - caller-supplied hash
 * @returns {Promise<boolean>} true only when the receipt carries the escrow's
 *   `Refunded` event for this bounty. Throws on RPC failure.
 */
export async function isRefundTransaction(bountyId, alias, txHash) {
  const { escrowContract, provider } = getNetworkClients(alias);
  const receipt = await provider.getTransactionReceipt(txHash);
  return Boolean(
    findRefundedEvent(receipt, {
      iface: escrowContract.interface,
      escrowAddress: escrowContract.target,
      bountyId
    })
  );
}

// How long a payout waits for its receipt before handing the (already
// broadcast) transaction back as unconfirmed. Kept under the route's
// `maxDuration` so the guard, not the platform, decides what happens to the
// lease when the chain is slow.
export const PAYOUT_CONFIRMATION_TIMEOUT_MS = 45 * 1000;

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

    const unconfirmed = (txHash, reason) => {
      logger.warn(`Bounty resolve unconfirmed on ${alias}: ${bountyId.slice(0, 10)}... -> ${txHash} (${reason})`);
      return {
        success: false,
        unconfirmed: true,
        txHash,
        error: `Transaction ${txHash} sent but not confirmed within ${PAYOUT_CONFIRMATION_TIMEOUT_MS / 1000}s`
      };
    };

    // Concurrent payouts for different bounties share this resolver wallet,
    // so two can populate the same pending nonce and one is refused. A
    // refused transaction can never mine, so re-signing with a fresh nonce
    // cannot double-send. One retry; a second refusal is a real failure.
    let tx;
    for (let attempt = 1; ; attempt += 1) {
      // Populate (nonce, gas estimate, fees) and sign. An escrow revert such
      // as NotOpen surfaces here, during gas estimation, before any send.
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

      try {
        tx = await provider.broadcastTransaction(signed);
        break;
      } catch (error) {
        if (!isDefinitiveBroadcastRejection(error)) {
          return unconfirmed(txHash, error?.code || 'broadcast response lost');
        }
        if (attempt === 1 && isNonceContention(error)) {
          logger.warn(`Payout nonce contention on ${alias}; re-signing ${bountyId.slice(0, 10)}...`);
          continue;
        }
        throw error;
      }
    }

    let receipt;
    try {
      receipt = await tx.wait(1, PAYOUT_CONFIRMATION_TIMEOUT_MS);
    } catch (error) {
      // Mined and reverted: definitive. Anything else may still mine.
      if (error?.code === 'CALL_EXCEPTION' && error?.receipt) throw error;
      return unconfirmed(tx.hash, error?.code || 'unknown');
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
 * Create a repo ID hash from a GitHub repo ID.
 * @param {number} repoId
 * @returns {string} bytes32 hex string
 */
export function createRepoIdHash(repoId) {
  const hex = '0x' + repoId.toString(16).padStart(64, '0');
  return hex;
}
