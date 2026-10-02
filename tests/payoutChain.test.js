import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { AbiCoder, Interface, Transaction, Wallet, keccak256 } from 'ethers';

import {
  findResolvedEvent,
  findRefundedEvent,
  isTxHash,
  isNonceContention,
  decodeRevert,
  isDefinitiveBroadcastRejection
} from '../server/blockchain/payoutChain.js';

/**
 * Recovery proves who a bounty was paid to by reading the `Resolved` event
 * from the one receipt the guard pinned at broadcast. These tests run the
 * real ethers Interface against encoded logs, so a signature or decoding
 * mistake fails here rather than silently marking every recovery unverified.
 */

// Same fragment as config/chain-registry.js (which cannot be imported under
// node --test because of its `@/` aliases); the drift test below pins it.
const RESOLVED = 'event Resolved(bytes32 indexed bountyId, address indexed recipient, uint256 net, uint256 fee)';
const iface = new Interface([RESOLVED, 'event Funded(bytes32 indexed bountyId, address indexed sponsor, uint256 amount)']);

const ESCROW = '0x00000000000000000000000000000000000000e5';
const BOUNTY = '0x' + '11'.repeat(32);
const OTHER_BOUNTY = '0x' + '22'.repeat(32);
const RECIPIENT = '0x1111111111111111111111111111111111111111';
const HASH = '0x' + 'ab'.repeat(32);

function resolvedLog(bountyId = BOUNTY, address = ESCROW) {
  const { data, topics } = iface.encodeEventLog('Resolved', [bountyId, RECIPIENT, 950n, 50n]);
  return { address, data, topics };
}

function receipt(logs, status = 1) {
  return { status, hash: HASH, logs };
}

const params = { iface, escrowAddress: ESCROW, bountyId: BOUNTY };

test('finds the recipient and hash of a matching Resolved event', () => {
  assert.deepEqual(findResolvedEvent(receipt([resolvedLog()]), params), {
    recipient: RECIPIENT,
    txHash: HASH
  });
});

test('matches addresses and bounty ids case-insensitively', () => {
  const found = findResolvedEvent(receipt([resolvedLog(BOUNTY, ESCROW.toUpperCase().replace('0X', '0x'))]), {
    ...params,
    bountyId: BOUNTY.toUpperCase().replace('0X', '0x')
  });
  assert.equal(found?.recipient, RECIPIENT);
});

test('ignores a lookalike event emitted by a different contract', () => {
  const spoof = resolvedLog(BOUNTY, '0x00000000000000000000000000000000000000aa');
  assert.equal(findResolvedEvent(receipt([spoof]), params), null);
});

test('ignores a Resolved event for a different bounty', () => {
  assert.equal(findResolvedEvent(receipt([resolvedLog(OTHER_BOUNTY)]), params), null);
});

test('skips unrelated and undecodable logs before the match', () => {
  const funded = { address: ESCROW, ...iface.encodeEventLog('Funded', [BOUNTY, RECIPIENT, 1n]) };
  const junk = { address: ESCROW, data: '0x', topics: ['0x' + 'ff'.repeat(32)] };
  assert.equal(findResolvedEvent(receipt([junk, funded, resolvedLog()]), params)?.txHash, HASH);
});

test('a reverted, missing, or log-less receipt proves nothing', () => {
  assert.equal(findResolvedEvent(receipt([resolvedLog()], 0), params), null);
  assert.equal(findResolvedEvent(null, params), null);
  assert.equal(findResolvedEvent({ status: 1, hash: HASH }, params), null);
});

test('the app ABI declares every escrow custom error and the Resolved event exactly', () => {
  // Without `error` fragments ethers reports "unknown custom error", and the
  // payout path can never recognize NotOpen or DeadlinePassed.
  const sol = readFileSync(new URL('../contracts/current/BountyEscrow.sol', import.meta.url), 'utf8');
  const registry = readFileSync(new URL('../config/chain-registry.js', import.meta.url), 'utf8');

  const contractErrors = [...sol.matchAll(/^\s*error\s+(\w+)\(\)\s*;/gm)].map((m) => m[1]).sort();
  const abiErrors = [...registry.matchAll(/'error\s+(\w+)\(\)'/g)].map((m) => m[1]).sort();
  assert.ok(contractErrors.length > 0);
  assert.deepEqual(abiErrors, contractErrors);
  assert.ok(registry.includes(`'${RESOLVED}'`));
});

test('decodes an escrow revert the way ethers raises it on gas estimation', () => {
  // ethers v6 decodes custom errors only on staticCall. On estimateGas and
  // send, JsonRpcProvider builds the error with getBuiltinCallException,
  // which leaves a custom error as raw selector data. This is that exact path.
  const escrow = new Interface(['function resolve(bytes32,address)', 'error NotOpen()', 'error DeadlinePassed()']);
  const raised = AbiCoder.getBuiltinCallException(
    'estimateGas',
    { to: ESCROW, data: '0x' },
    escrow.encodeErrorResult('NotOpen', [])
  );
  assert.match(raised.message, /unknown custom error/);
  assert.equal(decodeRevert(raised, escrow), 'NotOpen()');
});

test('revert decoding yields null for anything that is not a known escrow error', () => {
  const escrow = new Interface(['error NotOpen()']);
  assert.equal(decodeRevert(new Error('socket hang up'), escrow), null);
  assert.equal(decodeRevert({ code: 'CALL_EXCEPTION', data: null }, escrow), null);
  assert.equal(decodeRevert({ code: 'CALL_EXCEPTION', data: '0xdeadbeef' }, escrow), null);
  assert.equal(decodeRevert({ code: 'CALL_EXCEPTION', data: escrow.encodeErrorResult('NotOpen', []) }, null), null);
});

test('only refusals of this exact transaction count as a definitive broadcast failure', () => {
  for (const code of ['INSUFFICIENT_FUNDS', 'NONCE_EXPIRED', 'REPLACEMENT_UNDERPRICED']) {
    assert.equal(isDefinitiveBroadcastRejection({ code }), true, code);
  }
  // A lost response, a timeout, or "already known" may all still mine.
  for (const code of ['NETWORK_ERROR', 'TIMEOUT', 'SERVER_ERROR', 'UNKNOWN_ERROR', undefined]) {
    assert.equal(isDefinitiveBroadcastRejection({ code }), false, String(code));
  }
  assert.equal(isDefinitiveBroadcastRejection(null), false);
});

test('the hash pinned before broadcast is the hash the network will report', async () => {
  // contract.js pins Transaction.from(signed).hash before broadcasting;
  // ethers' broadcastTransaction rejects any node-reported hash that differs.
  const wallet = Wallet.createRandom();
  const signed = await wallet.signTransaction({
    to: ESCROW,
    data: '0x',
    nonce: 7,
    gasLimit: 100000n,
    maxFeePerGas: 2n,
    maxPriorityFeePerGas: 1n,
    chainId: 84532n,
    type: 2
  });
  assert.equal(Transaction.from(signed).hash, keccak256(signed));
});

test('refund verification accepts only this bounty\'s Refunded event from the escrow', () => {
  const refundIface = new Interface([
    RESOLVED,
    'event Refunded(bytes32 indexed bountyId, address indexed sponsor, uint256 amount)'
  ]);
  const refunded = (bountyId, address = ESCROW) => ({
    address,
    ...refundIface.encodeEventLog('Refunded', [bountyId, RECIPIENT, 1000n])
  });
  const p = { iface: refundIface, escrowAddress: ESCROW, bountyId: BOUNTY };

  assert.deepEqual(findRefundedEvent(receipt([refunded(BOUNTY)]), p), { sponsor: RECIPIENT, txHash: HASH });
  assert.equal(findRefundedEvent(receipt([refunded(OTHER_BOUNTY)]), p), null);
  assert.equal(findRefundedEvent(receipt([refunded(BOUNTY, '0x00000000000000000000000000000000000000aa')]), p), null);
  // A payout receipt is not a refund receipt.
  const payout = { address: ESCROW, ...refundIface.encodeEventLog('Resolved', [BOUNTY, RECIPIENT, 950n, 50n]) };
  assert.equal(findRefundedEvent(receipt([payout]), p), null);
});

test('only well-formed 32-byte hashes are accepted as transaction hashes', () => {
  assert.equal(isTxHash(HASH), true);
  assert.equal(isTxHash(HASH.toUpperCase().replace('0X', '0x')), true);
  for (const bad of ['', '0x', HASH.slice(0, -1), HASH + '0', 'ab'.repeat(32), `${HASH} `, null, 42]) {
    assert.equal(isTxHash(bad), false, String(bad));
  }
});

test('only nonce refusals are re-signed; insufficient funds is a real failure', () => {
  assert.equal(isNonceContention({ code: 'NONCE_EXPIRED' }), true);
  assert.equal(isNonceContention({ code: 'REPLACEMENT_UNDERPRICED' }), true);
  assert.equal(isNonceContention({ code: 'INSUFFICIENT_FUNDS' }), false);
  assert.equal(isNonceContention(null), false);
});
