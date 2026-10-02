/**
 * Pure helpers for the payout send path. Dependency-free so node --test can
 * exercise them with a real ethers Interface; server/blockchain/contract.js
 * wires them to live providers.
 */

/**
 * Finds the escrow's `Resolved` event for one bounty in a transaction receipt.
 *
 * This is how a recovering payout proves who a bounty was paid to without an
 * unbounded `eth_getLogs` scan (which many RPCs cap): the payout guard pins
 * each transaction hash to its claim once signed, before broadcast, so
 * recovery reads that one receipt instead of searching history.
 *
 * @param {object|null} receipt - ethers TransactionReceipt (or null if unknown)
 * @param {object} params
 * @param {object} params.iface - ethers Interface for the escrow contract
 * @param {string} params.escrowAddress - escrow contract address
 * @param {string} params.bountyId - bytes32 bounty id
 * @returns {{recipient: string, txHash: string}|null} the matching resolution,
 *   or null when the receipt is missing, reverted, or carries no matching event
 */
export function findResolvedEvent(receipt, { iface, escrowAddress, bountyId }) {
  if (!receipt || receipt.status !== 1 || !Array.isArray(receipt.logs)) return null;
  const escrow = String(escrowAddress).toLowerCase();
  const wanted = String(bountyId).toLowerCase();

  for (const log of receipt.logs) {
    // Only the escrow itself can emit a trustworthy `Resolved`; any other
    // contract in the same transaction could emit a lookalike.
    if (String(log?.address).toLowerCase() !== escrow) continue;
    let parsed = null;
    try {
      parsed = iface.parseLog(log);
    } catch {
      continue;
    }
    if (parsed?.name !== 'Resolved') continue;
    if (String(parsed.args.bountyId).toLowerCase() !== wanted) continue;
    return { recipient: parsed.args.recipient, txHash: receipt.hash };
  }
  return null;
}

// Broadcast errors where the node refused this exact signed transaction. It
// can never mine, so the send is a definitive failure. Anything else after
// signing (lost response, timeout, "already known") may still mine.
const DEFINITIVE_BROADCAST_REJECTIONS = new Set([
  'INSUFFICIENT_FUNDS',
  'NONCE_EXPIRED',
  'REPLACEMENT_UNDERPRICED'
]);

/**
 * Whether a broadcast error proves the transaction was not accepted.
 * @param {unknown} error
 * @returns {boolean}
 */
export function isDefinitiveBroadcastRejection(error) {
  return DEFINITIVE_BROADCAST_REJECTIONS.has(error?.code);
}

/**
 * Names an escrow custom-error revert. ethers v6 decodes custom errors only
 * on `staticCall`; on send and gas estimation the revert arrives as raw
 * selector data, so `NotOpen` would otherwise surface as
 * "execution reverted (unknown custom error)".
 *
 * @param {unknown} error - ethers error, possibly a CALL_EXCEPTION with data
 * @param {object|null} iface - ethers Interface for the escrow contract
 * @returns {string|null} e.g. "NotOpen()", or null when not decodable
 */
export function decodeRevert(error, iface) {
  const data = error?.data;
  if (!iface || error?.code !== 'CALL_EXCEPTION' || typeof data !== 'string' || data.length < 10) {
    return null;
  }
  try {
    return iface.parseError(data)?.signature ?? null;
  } catch {
    return null;
  }
}
