/**
 * Pure helpers for the escrow send and verification paths. Dependency-free
 * so node --test can exercise them with a real ethers Interface;
 * server/blockchain/contract.js wires them to live providers.
 */

/**
 * Finds one escrow event for one bounty in a transaction receipt.
 *
 * Only the escrow itself can emit a trustworthy event; any other contract in
 * the same transaction could emit a lookalike with the same signature, so
 * logs from other addresses are ignored.
 *
 * @param {object|null} receipt - ethers TransactionReceipt (or null if unknown)
 * @param {object} params
 * @param {object} params.iface - ethers Interface for the escrow contract
 * @param {string} params.escrowAddress - escrow contract address
 * @param {string} params.bountyId - bytes32 bounty id
 * @param {string} params.eventName - e.g. 'Resolved' or 'Refunded'
 * @returns {{args: object, txHash: string}|null} the matching event, or null
 *   when the receipt is missing, reverted, or carries no matching event
 */
export function findEscrowEvent(receipt, { iface, escrowAddress, bountyId, eventName }) {
  if (!receipt || receipt.status !== 1 || !Array.isArray(receipt.logs)) return null;
  const escrow = String(escrowAddress).toLowerCase();
  const wanted = String(bountyId).toLowerCase();

  for (const log of receipt.logs) {
    if (String(log?.address).toLowerCase() !== escrow) continue;
    let parsed = null;
    try {
      parsed = iface.parseLog(log);
    } catch {
      continue;
    }
    if (parsed?.name !== eventName) continue;
    if (String(parsed.args.bountyId).toLowerCase() !== wanted) continue;
    return { args: parsed.args, txHash: receipt.hash };
  }
  return null;
}

/**
 * Finds the escrow's `Resolved` event for one bounty in a transaction receipt.
 *
 * This is how a recovering payout proves who a bounty was paid to without an
 * unbounded `eth_getLogs` scan (which many RPCs cap): the payout guard pins
 * each transaction hash to its claim once signed, before broadcast, so
 * recovery reads that one receipt instead of searching history.
 *
 * @returns {{recipient: string, txHash: string}|null}
 */
export function findResolvedEvent(receipt, { iface, escrowAddress, bountyId }) {
  const found = findEscrowEvent(receipt, { iface, escrowAddress, bountyId, eventName: 'Resolved' });
  return found ? { recipient: found.args.recipient, txHash: found.txHash } : null;
}

/**
 * Finds the escrow's `Refunded` event for one bounty in a transaction receipt.
 * Refund confirmation uses it to store only a hash that provably refunded
 * this bounty, never whatever string the caller sent.
 *
 * @returns {{sponsor: string, txHash: string}|null}
 */
export function findRefundedEvent(receipt, { iface, escrowAddress, bountyId }) {
  const found = findEscrowEvent(receipt, { iface, escrowAddress, bountyId, eventName: 'Refunded' });
  return found ? { sponsor: found.args.sponsor, txHash: found.txHash } : null;
}

/**
 * Whether a string is a well-formed 32-byte transaction hash.
 * @param {unknown} value
 * @returns {boolean}
 */
export function isTxHash(value) {
  return typeof value === 'string' && /^0x[0-9a-fA-F]{64}$/.test(value);
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
 * Whether a refusal was over the nonce: another transaction from the same
 * resolver took it first. Re-signing with a fresh nonce is safe because the
 * refused transaction can never mine.
 * @param {unknown} error
 * @returns {boolean}
 */
export function isNonceContention(error) {
  return error?.code === 'NONCE_EXPIRED' || error?.code === 'REPLACEMENT_UNDERPRICED';
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
