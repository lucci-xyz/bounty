import { test } from 'node:test';
import assert from 'node:assert/strict';

import { reconcileStaleLeases } from '../server/payouts/reconcileStaleLeases.js';
import { BOUNTY_STATUS, CLAIM_STATUS, RESOLVING_LEASE_MS } from '../lib/status/index.js';
import { ADDR, NOW, TX, createPayoutStore } from './helpers/payoutStore.js';

/**
 * The reconciler is the backstop for payout leases nobody came back for.
 * It must settle only what the chain already decided, never send, and never
 * touch a lease a live worker still holds.
 */

const STALE = NOW - RESOLVING_LEASE_MS - 1;
const silentLogger = { info() {}, warn() {}, error() {} };

function run(store, { reader, wallets = { 7: ADDR }, announce } = {}) {
  const announced = [];
  const deps = {
    bountyQueries: store.bountyQueries,
    prClaimQueries: store.prClaimQueries,
    walletQueries: {
      findByGithubId: (githubId) => (wallets[githubId] ? { walletAddress: wallets[githubId] } : null)
    },
    readOnchainStatus: reader ?? (() => ({ status: BOUNTY_STATUS.OPEN })),
    announcePayment:
      announce ??
      ((payload) => {
        announced.push(payload);
      }),
    logger: silentLogger
  };
  return { announced, promise: reconcileStaleLeases({ nowMs: NOW }, deps) };
}

test('an unconfirmed send that later mined is recorded as paid and announced once', async () => {
  const store = createPayoutStore({
    claims: [{ id: 1, bountyId: '0xb1', status: CLAIM_STATUS.PROCESSING, txHash: TX, prAuthorGithubId: 7 }],
    bounties: [{ bountyId: '0xb1', status: BOUNTY_STATUS.RESOLVING, updatedAt: STALE }]
  });
  let readerSaw = null;
  const { announced, promise } = run(store, {
    reader: (bounty, id, options) => {
      readerSaw = options;
      return { status: BOUNTY_STATUS.RESOLVED, recipient: ADDR, txHash: TX };
    }
  });

  assert.deepEqual(await promise, [{ bountyId: '0xb1', claimId: 1, outcome: 'paid', reason: undefined }]);
  assert.deepEqual(readerSaw, { txHash: TX });
  assert.equal(store.claimRows.get(1).status, CLAIM_STATUS.PAID);
  assert.equal(store.bountyRows.get('0xb1').status, BOUNTY_STATUS.RESOLVED);
  assert.equal(announced.length, 1);
  assert.equal(announced[0].txHash, TX);
  assert.equal(announced[0].claim.id, 1);
});

test('a dead worker that never reached the chain is handed back for retry, never re-sent', async () => {
  const store = createPayoutStore({
    claims: [{ id: 1, bountyId: '0xb1', status: CLAIM_STATUS.PROCESSING, prAuthorGithubId: 7 }],
    bounties: [{ bountyId: '0xb1', status: BOUNTY_STATUS.RESOLVING, updatedAt: STALE }]
  });
  const { announced, promise } = run(store);

  const [result] = await promise;
  assert.equal(result.outcome, 'released');
  assert.equal(store.claimRows.get(1).status, CLAIM_STATUS.FAILED);
  assert.equal(store.bountyRows.get('0xb1').status, BOUNTY_STATUS.OPEN);
  assert.equal(announced.length, 0);
});

test('a send still in the mempool, or an unreadable chain, is held rather than released', async () => {
  const pending = createPayoutStore({
    claims: [{ id: 1, bountyId: '0xb1', status: CLAIM_STATUS.PROCESSING, txHash: TX, prAuthorGithubId: 7 }],
    bounties: [{ bountyId: '0xb1', status: BOUNTY_STATUS.RESOLVING, updatedAt: STALE }]
  });
  const [held] = await run(pending, {
    reader: () => ({ status: BOUNTY_STATUS.OPEN, pinnedPending: true })
  }).promise;
  assert.equal(held.reason, 'earlier-send-pending');
  assert.equal(pending.claimRows.get(1).status, CLAIM_STATUS.PROCESSING);

  const blind = createPayoutStore({
    claims: [{ id: 1, bountyId: '0xb1', status: CLAIM_STATUS.PROCESSING, prAuthorGithubId: 7 }],
    bounties: [{ bountyId: '0xb1', status: BOUNTY_STATUS.RESOLVING, updatedAt: STALE }]
  });
  const [unread] = await run(blind, {
    reader: () => {
      throw new Error('rpc down');
    }
  }).promise;
  assert.equal(unread.reason, 'chain-unreadable');
  assert.equal(blind.claimRows.get(1).status, CLAIM_STATUS.PROCESSING);
  assert.equal(blind.bountyRows.get('0xb1').status, BOUNTY_STATUS.RESOLVING);
});

test('a fresh lease belongs to a live worker and is never selected', async () => {
  const store = createPayoutStore({
    claims: [{ id: 1, bountyId: '0xb1', status: CLAIM_STATUS.PROCESSING, prAuthorGithubId: 7 }],
    bounties: [{ bountyId: '0xb1', status: BOUNTY_STATUS.RESOLVING, updatedAt: NOW - 1000 }]
  });
  assert.deepEqual(await run(store).promise, []);
  assert.equal(store.claimRows.get(1).status, CLAIM_STATUS.PROCESSING);
});

test('a bounty lease with no claim in flight is released; a paid claim finishes its bounty row', async () => {
  const store = createPayoutStore({
    claims: [
      { id: 1, bountyId: '0xb1', status: CLAIM_STATUS.PENDING, prAuthorGithubId: 7 },
      { id: 2, bountyId: '0xb2', status: CLAIM_STATUS.PAID, txHash: TX, prAuthorGithubId: 7 }
    ],
    bounties: [
      { bountyId: '0xb1', status: BOUNTY_STATUS.RESOLVING, updatedAt: STALE },
      { bountyId: '0xb2', status: BOUNTY_STATUS.RESOLVING, updatedAt: STALE }
    ]
  });

  const results = await run(store).promise;
  assert.deepEqual(
    results.map(({ bountyId, outcome }) => [bountyId, outcome]),
    [['0xb1', 'released'], ['0xb2', 'skipped']]
  );
  assert.equal(store.bountyRows.get('0xb1').status, BOUNTY_STATUS.OPEN);
  assert.equal(store.claimRows.get(1).status, CLAIM_STATUS.PENDING, 'an unmerged claim is untouched');
  assert.equal(store.bountyRows.get('0xb2').status, BOUNTY_STATUS.RESOLVED);
  assert.equal(store.bountyRows.get('0xb2').txHash, TX);
});

test('one failing row or announcement does not stop the sweep', async () => {
  const store = createPayoutStore({
    claims: [
      { id: 1, bountyId: '0xb1', status: CLAIM_STATUS.PROCESSING, txHash: TX, prAuthorGithubId: 7 },
      { id: 2, bountyId: '0xb2', status: CLAIM_STATUS.PROCESSING, prAuthorGithubId: 7 }
    ],
    bounties: [
      { bountyId: '0xb1', status: BOUNTY_STATUS.RESOLVING, updatedAt: STALE },
      { bountyId: '0xb2', status: BOUNTY_STATUS.RESOLVING, updatedAt: STALE }
    ]
  });

  const results = await run(store, {
    reader: (bounty) =>
      bounty.bountyId === '0xb1'
        ? { status: BOUNTY_STATUS.RESOLVED, recipient: ADDR, txHash: TX }
        : { status: BOUNTY_STATUS.OPEN },
    announce: () => {
      throw new Error('github down');
    }
  }).promise;

  assert.deepEqual(
    results.map(({ outcome }) => outcome),
    ['paid', 'released']
  );
  assert.equal(store.claimRows.get(1).status, CLAIM_STATUS.PAID, 'rows stay correct when the announcement fails');
});

test('with no wallet to compare and no hash match, attribution stays unknown', async () => {
  // The contributor unlinked their wallet after the crash. The chain paid
  // someone; without a pin or a wallet there is no proof either way.
  const store = createPayoutStore({
    claims: [{ id: 1, bountyId: '0xb1', status: CLAIM_STATUS.PROCESSING, prAuthorGithubId: 7 }],
    bounties: [{ bountyId: '0xb1', status: BOUNTY_STATUS.RESOLVING, updatedAt: STALE }]
  });
  const [result] = await run(store, {
    wallets: {},
    reader: () => ({ status: BOUNTY_STATUS.RESOLVED, recipient: ADDR, txHash: TX })
  }).promise;

  assert.equal(result.reason, 'attribution-unknown');
  assert.equal(store.claimRows.get(1).status, CLAIM_STATUS.PROCESSING);
  assert.equal(store.bountyRows.get('0xb1').status, BOUNTY_STATUS.RESOLVING);
});
