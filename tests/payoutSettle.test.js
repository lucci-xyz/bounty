import { test } from 'node:test';
import assert from 'node:assert/strict';

import { settleClaim, PAYOUT_FAILURE } from '../server/payouts/settleClaim.js';
import {
  ADDR,
  NOW,
  TX,
  createPayoutStore,
  depsFor,
  deferred
} from './helpers/payoutStore.js';
import {
  BOUNTY_STATUS,
  CLAIM_STATUS,
  RESOLVING_LEASE_MS,
  VALID_STATUSES,
  TERMINAL_STATUSES,
  isValidStatus,
  isAcquirableClaimStatus,
  isResolvingLeaseStale,
  isPayoutCandidateBountyStatus,
  isRetryableClaimStatus
} from '../lib/status/index.js';

/**
 * Exactly-once payout settlement.
 *
 * Root causes pinned down here:
 *
 * 1. The merge handler and the manual retry route both ran check-then-act on
 *    `bounty.status === 'open'` with unconditional writes afterwards, so two
 *    overlapping attempts could each send an on-chain resolution for the same
 *    bounty. Settlement now runs behind one conditional acquire per row, and
 *    the chain send happens in exactly one place.
 *
 * 2. A contributor who merged without a linked wallet landed in
 *    `pending_wallet`, which the retry API rejected and the dashboard never
 *    listed — a dead end that needed a maintainer. `pending_wallet` is now an
 *    acquirable state.
 *
 * 3. The entry points gated on `bounty.status === 'open'`, so a worker that
 *    died mid-payout left `resolving`/`processing` rows that nothing could
 *    ever hand back to the guard: the stale-lease steal was unreachable in
 *    production. The gate vocabulary now includes `resolving`/`processing`.
 *
 * 4. "Resolved on-chain" was treated as "resolved to this claimant". Two PRs
 *    can claim one bounty; the guard now compares the on-chain recipient
 *    before marking a claim paid.
 *
 * 5. A receipt that never arrived was reported as a failure and released the
 *    rows, inviting a second send while the first could still mine. It is
 *    now `pending`: hash pinned to the claim, leases held, reconciled later.
 *
 * Fidelity note: the fake store below reproduces the real helpers'
 * conditional-update contract (match-then-flip, report whether exactly one
 * row flipped) with genuinely atomic compare-and-set, so these tests prove
 * the orchestration order — acquire before send, single send under overlap,
 * release on failure. The production atomicity of that contract rests on
 * single-statement conditional UPDATEs in Postgres (Prisma `updateMany`
 * reports the matched-row count; concurrent updaters serialize with WHERE
 * re-evaluation), which a fake cannot prove.
 */

test('happy path pays once and records the transaction on both rows', async () => {
  const store = createPayoutStore({
    claims: [{ id: 1, status: CLAIM_STATUS.PENDING }],
    bounties: [{ bountyId: '0xb1', status: BOUNTY_STATUS.OPEN, updatedAt: NOW }]
  });
  const seen = [];
  const deps = depsFor(store, (bountyId, recipient) => {
    seen.push([bountyId, recipient]);
    return { success: true, txHash: TX };
  });

  const result = await settleClaim(
    { claimId: 1, bountyId: '0xb1', recipientAddress: ADDR, nowMs: NOW },
    deps
  );

  assert.deepEqual(result, { outcome: 'paid', txHash: TX });
  assert.deepEqual(seen, [['0xb1', ADDR]]);
  assert.equal(store.claimRows.get(1).status, CLAIM_STATUS.PAID);
  assert.equal(store.claimRows.get(1).txHash, TX);
  assert.equal(store.bountyRows.get('0xb1').status, BOUNTY_STATUS.RESOLVED);
  assert.equal(store.bountyRows.get('0xb1').txHash, TX);
});

test('failed and pending_wallet claims are payable, paid claims are skipped', async () => {
  for (const status of [CLAIM_STATUS.FAILED, CLAIM_STATUS.PENDING_WALLET]) {
    const store = createPayoutStore({
      claims: [{ id: 7, status }],
      bounties: [{ bountyId: '0xb2', status: BOUNTY_STATUS.OPEN, updatedAt: NOW }]
    });
    let sends = 0;
    const deps = depsFor(store, () => {
      sends += 1;
      return { success: true, txHash: TX };
    });

    const result = await settleClaim(
      { claimId: 7, bountyId: '0xb2', recipientAddress: ADDR, nowMs: NOW },
      deps
    );

    assert.equal(result.outcome, 'paid', `status ${status} should settle`);
    assert.equal(sends, 1);
  }

  // A paid claim never re-enters, even if its bounty row wrongly reads open:
  // the bounty is reconciled to resolved instead of paying twice.
  const store = createPayoutStore({
    claims: [{ id: 9, status: CLAIM_STATUS.PAID, txHash: TX }],
    bounties: [{ bountyId: '0xb3', status: BOUNTY_STATUS.OPEN, updatedAt: NOW }]
  });
  let sends = 0;
  const deps = depsFor(store, () => {
    sends += 1;
    return { success: true, txHash: '0xother' };
  });

  const result = await settleClaim(
    { claimId: 9, bountyId: '0xb3', recipientAddress: ADDR, nowMs: NOW },
    deps
  );

  assert.deepEqual(result, { outcome: 'skipped', reason: 'already-paid' });
  assert.equal(sends, 0);
  assert.equal(store.bountyRows.get('0xb3').status, BOUNTY_STATUS.RESOLVED);
  assert.equal(store.bountyRows.get('0xb3').txHash, TX);
});

test('overlapping attempts for one claim send exactly one transaction', async () => {
  const store = createPayoutStore({
    claims: [{ id: 1, status: CLAIM_STATUS.PENDING }],
    bounties: [{ bountyId: '0xb1', status: BOUNTY_STATUS.OPEN, updatedAt: NOW }]
  });
  let sends = 0;
  const gate = deferred();
  const deps = depsFor(store, async () => {
    sends += 1;
    await gate.promise;
    return { success: true, txHash: TX };
  });
  const params = { claimId: 1, bountyId: '0xb1', recipientAddress: ADDR, nowMs: NOW };

  const first = settleClaim(params, deps);
  // Let the first attempt acquire and park inside the gated send before the
  // second attempt starts, so the overlap is real rather than sequential.
  await new Promise((r) => setImmediate(r));
  await new Promise((r) => setImmediate(r));
  const second = settleClaim(params, deps);
  gate.resolve();
  const [r1, r2] = await Promise.all([first, second]);

  assert.equal(sends, 1);
  assert.equal(r1.outcome, 'paid');
  assert.equal(r2.outcome, 'skipped');
  assert.equal(store.claimRows.get(1).status, CLAIM_STATUS.PAID);
});

test('two claims on one bounty pay the winner and skip the loser', async () => {
  const store = createPayoutStore({
    claims: [
      { id: 1, status: CLAIM_STATUS.PENDING },
      { id: 2, status: CLAIM_STATUS.PENDING }
    ],
    bounties: [{ bountyId: '0xb1', status: BOUNTY_STATUS.OPEN, updatedAt: NOW }]
  });
  let sends = 0;
  const deps = depsFor(store, () => {
    sends += 1;
    return { success: true, txHash: TX };
  });

  const r1 = await settleClaim(
    { claimId: 1, bountyId: '0xb1', recipientAddress: ADDR, nowMs: NOW },
    deps
  );
  const r2 = await settleClaim(
    { claimId: 2, bountyId: '0xb1', recipientAddress: ADDR, nowMs: NOW },
    deps
  );

  assert.equal(sends, 1);
  assert.equal(r1.outcome, 'paid');
  assert.equal(r2.outcome, 'skipped');
  assert.equal(r2.reason, 'bounty-not-acquirable');
});

test('a failed send releases both rows so a later retry can pay', async () => {
  const store = createPayoutStore({
    claims: [{ id: 1, status: CLAIM_STATUS.PENDING }],
    bounties: [{ bountyId: '0xb1', status: BOUNTY_STATUS.OPEN, updatedAt: NOW }]
  });
  let attempts = 0;
  const deps = depsFor(store, () => {
    attempts += 1;
    if (attempts === 1) return { success: false, error: 'boom' };
    return { success: true, txHash: TX };
  });
  const params = { claimId: 1, bountyId: '0xb1', recipientAddress: ADDR, nowMs: NOW };

  const failed = await settleClaim(params, deps);
  assert.deepEqual(failed, {
    outcome: 'failed',
    reason: PAYOUT_FAILURE.SEND_FAILED,
    error: 'boom',
    publicError: null
  });
  assert.equal(store.claimRows.get(1).status, CLAIM_STATUS.FAILED);
  assert.equal(store.bountyRows.get('0xb1').status, BOUNTY_STATUS.OPEN);

  const retried = await settleClaim(params, deps);
  assert.equal(retried.outcome, 'paid');
  assert.equal(attempts, 2);
});

test('a throwing sender is treated as a failed send, not a crash', async () => {
  const store = createPayoutStore({
    claims: [{ id: 1, status: CLAIM_STATUS.FAILED }],
    bounties: [{ bountyId: '0xb1', status: BOUNTY_STATUS.OPEN, updatedAt: NOW }]
  });
  const deps = depsFor(store, () => {
    throw new Error('rpc down');
  });

  const result = await settleClaim(
    { claimId: 1, bountyId: '0xb1', recipientAddress: ADDR, nowMs: NOW },
    deps
  );

  assert.deepEqual(result, {
    outcome: 'failed',
    reason: PAYOUT_FAILURE.SEND_FAILED,
    error: 'rpc down',
    publicError: null
  });
  assert.equal(store.claimRows.get(1).status, CLAIM_STATUS.FAILED);
  assert.equal(store.bountyRows.get('0xb1').status, BOUNTY_STATUS.OPEN);
});

test('a stale resolving lease is stolen and settled; a fresh one is left alone', async () => {
  const staleAt = NOW - RESOLVING_LEASE_MS - 1;
  const stolen = createPayoutStore({
    claims: [{ id: 1, status: CLAIM_STATUS.PROCESSING }],
    bounties: [{ bountyId: '0xb1', status: BOUNTY_STATUS.RESOLVING, updatedAt: staleAt }]
  });
  let sends = 0;
  const stolenResult = await settleClaim(
    { claimId: 1, bountyId: '0xb1', recipientAddress: ADDR, nowMs: NOW },
    depsFor(stolen, () => {
      sends += 1;
      return { success: true, txHash: TX };
    })
  );

  assert.equal(stolenResult.outcome, 'paid');
  assert.equal(sends, 1);

  const fresh = createPayoutStore({
    claims: [{ id: 2, status: CLAIM_STATUS.PENDING }],
    bounties: [{ bountyId: '0xb2', status: BOUNTY_STATUS.RESOLVING, updatedAt: NOW }]
  });
  let freshSends = 0;
  const freshResult = await settleClaim(
    { claimId: 2, bountyId: '0xb2', recipientAddress: ADDR, nowMs: NOW },
    depsFor(fresh, () => {
      freshSends += 1;
      return { success: true, txHash: TX };
    })
  );

  assert.equal(freshResult.outcome, 'skipped');
  assert.equal(freshSends, 0);
});

test('a paid claim with a resolving bounty reconciles the bounty without sending', async () => {
  // Crash window: the transaction confirmed and the claim row flipped, but
  // the process died before the bounty row flipped. The next attempt must
  // finish the bookkeeping, not pay again.
  const store = createPayoutStore({
    claims: [{ id: 1, status: CLAIM_STATUS.PAID, txHash: TX }],
    bounties: [
      { bountyId: '0xb1', status: BOUNTY_STATUS.RESOLVING, updatedAt: NOW - RESOLVING_LEASE_MS - 1 }
    ]
  });
  let sends = 0;
  const result = await settleClaim(
    { claimId: 1, bountyId: '0xb1', recipientAddress: ADDR, nowMs: NOW },
    depsFor(store, () => {
      sends += 1;
      return { success: true, txHash: '0xother' };
    })
  );

  assert.deepEqual(result, { outcome: 'skipped', reason: 'already-paid' });
  assert.equal(sends, 0);
  assert.equal(store.bountyRows.get('0xb1').status, BOUNTY_STATUS.RESOLVED);
  assert.equal(store.bountyRows.get('0xb1').txHash, TX);
});

test('claim acquire vocabulary matches the payout guard', () => {
  for (const status of [CLAIM_STATUS.PENDING, CLAIM_STATUS.FAILED, CLAIM_STATUS.PENDING_WALLET]) {
    assert.equal(isAcquirableClaimStatus(status), true, `${status} acquires`);
  }
  assert.equal(isAcquirableClaimStatus(CLAIM_STATUS.PAID), false);
  assert.equal(isAcquirableClaimStatus(CLAIM_STATUS.PROCESSING), false);
  assert.equal(isAcquirableClaimStatus(CLAIM_STATUS.PROCESSING, true), true);
  assert.equal(isAcquirableClaimStatus('bogus'), false);
  assert.equal(isAcquirableClaimStatus(null), false);
});

test('resolving lease staleness is strict at the boundary', () => {
  assert.equal(isResolvingLeaseStale(NOW, NOW), false);
  assert.equal(isResolvingLeaseStale(NOW - RESOLVING_LEASE_MS, NOW), false);
  assert.equal(isResolvingLeaseStale(NOW - RESOLVING_LEASE_MS - 1, NOW), true);
  assert.equal(isResolvingLeaseStale(null, NOW), false);
});

test('resolving is valid but never terminal', () => {
  assert.equal(isValidStatus(BOUNTY_STATUS.OPEN), true);
  assert.equal(isValidStatus(BOUNTY_STATUS.RESOLVING), true);
  assert.equal(isValidStatus(BOUNTY_STATUS.RESOLVED), true);
  assert.equal(isValidStatus(BOUNTY_STATUS.REFUNDED), true);
  assert.equal(VALID_STATUSES.has(BOUNTY_STATUS.RESOLVING), true);
  assert.equal(TERMINAL_STATUSES.has(BOUNTY_STATUS.RESOLVING), false);
});

test('an on-chain resolved bounty paid to this claimant reconciles instead of re-sending', async () => {
  // A prior send confirmed without being recorded (crash or receipt failure
  // between broadcast and settle). The chain is the authority on whether
  // funds moved: reconcile the rows with the real hash, never re-send.
  const store = createPayoutStore({
    claims: [{ id: 1, status: CLAIM_STATUS.FAILED }],
    bounties: [{ bountyId: '0xb1', status: BOUNTY_STATUS.OPEN, updatedAt: NOW }]
  });
  let sends = 0;
  const deps = depsFor(
    store,
    () => {
      sends += 1;
      return { success: true, txHash: '0xother' };
    },
    () => ({ status: BOUNTY_STATUS.RESOLVED, recipient: ADDR.toUpperCase(), txHash: TX })
  );

  const result = await settleClaim(
    { claimId: 1, bountyId: '0xb1', recipientAddress: ADDR, nowMs: NOW },
    deps
  );

  assert.deepEqual(result, { outcome: 'paid', txHash: TX, reconciled: true });
  assert.equal(sends, 0);
  assert.equal(store.claimRows.get(1).status, CLAIM_STATUS.PAID);
  assert.equal(store.claimRows.get(1).txHash, TX);
  assert.equal(store.bountyRows.get('0xb1').status, BOUNTY_STATUS.RESOLVED);
  assert.equal(store.bountyRows.get('0xb1').txHash, TX);
});

test('an on-chain resolved bounty paid to someone else fails this claim, never marks it paid', async () => {
  // Two PRs claimed one bounty. The chain paid the other author. This claim
  // must not show a green badge for money it did not receive.
  const OTHER = '0x2222222222222222222222222222222222222222';
  const store = createPayoutStore({
    claims: [{ id: 1, status: CLAIM_STATUS.PENDING }],
    bounties: [{ bountyId: '0xb1', status: BOUNTY_STATUS.OPEN, updatedAt: NOW }]
  });
  let sends = 0;
  const deps = depsFor(
    store,
    () => {
      sends += 1;
      return { success: true, txHash: '0xother' };
    },
    () => ({ status: BOUNTY_STATUS.RESOLVED, recipient: OTHER, txHash: TX })
  );

  const result = await settleClaim(
    { claimId: 1, bountyId: '0xb1', recipientAddress: ADDR, nowMs: NOW },
    deps
  );

  assert.equal(result.outcome, 'failed');
  assert.equal(result.reason, PAYOUT_FAILURE.RESOLVED_ELSEWHERE);
  assert.match(result.publicError, /different wallet/);
  // The public message goes on a GitHub comment; it must not tie a wallet
  // address to this pull request.
  assert.doesNotMatch(result.publicError, new RegExp(OTHER));
  assert.equal(sends, 0);
  assert.equal(store.claimRows.get(1).status, CLAIM_STATUS.FAILED);
  assert.equal(store.bountyRows.get('0xb1').status, BOUNTY_STATUS.RESOLVED);
  assert.equal(store.bountyRows.get('0xb1').txHash, TX);
});

test('an on-chain resolved bounty with an unfindable resolution holds instead of guessing', async () => {
  // Bare-string readers (and a failed or capped event lookup) carry no
  // resolving transaction. Unknown is neither a match nor a mismatch:
  // failing the claim and closing the bounty would strand a contributor who
  // may well have been paid. Nothing is sent, nothing is decided, both
  // leases stay held for a later attempt to re-read.
  const store = createPayoutStore({
    claims: [{ id: 1, status: CLAIM_STATUS.FAILED }],
    bounties: [{ bountyId: '0xb1', status: BOUNTY_STATUS.OPEN, updatedAt: NOW }]
  });
  let sends = 0;
  const deps = depsFor(
    store,
    () => {
      sends += 1;
      return { success: true, txHash: '0xother' };
    },
    () => BOUNTY_STATUS.RESOLVED
  );

  const result = await settleClaim(
    { claimId: 1, bountyId: '0xb1', recipientAddress: ADDR, nowMs: NOW },
    deps
  );

  assert.deepEqual(result, { outcome: 'pending', txHash: null, reason: 'attribution-unknown' });
  assert.equal(sends, 0);
  assert.equal(store.claimRows.get(1).status, CLAIM_STATUS.PROCESSING);
  assert.equal(store.bountyRows.get('0xb1').status, BOUNTY_STATUS.RESOLVING);
});

test('entry-point gates admit the states the guard must be able to recover', () => {
  // Both production entry points hand rows to the guard only when these
  // say so. If `resolving`/`processing` ever drop out, the stale-lease
  // steal becomes unreachable again and crashed payouts strand.
  assert.equal(isPayoutCandidateBountyStatus(BOUNTY_STATUS.OPEN), true);
  assert.equal(isPayoutCandidateBountyStatus(BOUNTY_STATUS.RESOLVING), true);
  assert.equal(isPayoutCandidateBountyStatus(BOUNTY_STATUS.RESOLVED), false);
  assert.equal(isPayoutCandidateBountyStatus(BOUNTY_STATUS.REFUNDED), false);

  assert.equal(isRetryableClaimStatus(CLAIM_STATUS.FAILED), true);
  assert.equal(isRetryableClaimStatus(CLAIM_STATUS.PENDING_WALLET), true);
  assert.equal(isRetryableClaimStatus(CLAIM_STATUS.PROCESSING), true);
  assert.equal(isRetryableClaimStatus(CLAIM_STATUS.PENDING), false);
  assert.equal(isRetryableClaimStatus(CLAIM_STATUS.PAID), false);
});

test('an unconfirmed broadcast holds both leases and pins the hash to the claim', async () => {
  // The receipt did not arrive in time. Releasing would invite a second
  // send while the first may still mine. Hold, record, report pending.
  const store = createPayoutStore({
    claims: [{ id: 1, status: CLAIM_STATUS.PENDING }],
    bounties: [{ bountyId: '0xb1', status: BOUNTY_STATUS.OPEN, updatedAt: NOW }]
  });
  const result = await settleClaim(
    { claimId: 1, bountyId: '0xb1', recipientAddress: ADDR, nowMs: NOW },
    depsFor(store, () => ({ success: false, unconfirmed: true, txHash: TX, error: 'timeout' }))
  );

  assert.deepEqual(result, { outcome: 'pending', txHash: TX, reason: 'unconfirmed' });
  assert.equal(store.claimRows.get(1).status, CLAIM_STATUS.PROCESSING);
  assert.equal(store.claimRows.get(1).txHash, TX);
  assert.equal(store.bountyRows.get('0xb1').status, BOUNTY_STATUS.RESOLVING);
  assert.equal(store.bountyRows.get('0xb1').updatedAt, NOW);
});

test('a crashed payout recovers end to end: pending, fresh lease skipped, stale lease reconciled from chain', async () => {
  // Attempt 1 broadcasts and times out. Attempt 2 arrives inside the lease
  // and must not send. Attempt 3 arrives after the lease expires, finds the
  // chain resolved to this claimant, and finishes the bookkeeping with the
  // real hash. Exactly one send across all three.
  const store = createPayoutStore({
    claims: [{ id: 1, status: CLAIM_STATUS.PENDING }],
    bounties: [{ bountyId: '0xb1', status: BOUNTY_STATUS.OPEN, updatedAt: NOW }]
  });
  let sends = 0;
  let chainResolved = false;
  const sender = () => {
    sends += 1;
    chainResolved = true;
    return { success: false, unconfirmed: true, txHash: TX, error: 'timeout' };
  };
  const reader = () =>
    chainResolved
      ? { status: BOUNTY_STATUS.RESOLVED, recipient: ADDR, txHash: TX }
      : { status: BOUNTY_STATUS.OPEN, recipient: null, txHash: null };

  const first = await settleClaim(
    { claimId: 1, bountyId: '0xb1', recipientAddress: ADDR, nowMs: NOW },
    depsFor(store, sender, reader)
  );
  assert.equal(first.outcome, 'pending');

  const second = await settleClaim(
    { claimId: 1, bountyId: '0xb1', recipientAddress: ADDR, nowMs: NOW + 1000 },
    depsFor(store, sender, reader)
  );
  assert.deepEqual(second, { outcome: 'skipped', reason: 'bounty-not-acquirable' });

  const third = await settleClaim(
    { claimId: 1, bountyId: '0xb1', recipientAddress: ADDR, nowMs: NOW + RESOLVING_LEASE_MS + 1 },
    depsFor(store, sender, reader)
  );
  assert.deepEqual(third, { outcome: 'paid', txHash: TX, reconciled: true });

  assert.equal(sends, 1);
  assert.equal(store.claimRows.get(1).status, CLAIM_STATUS.PAID);
  assert.equal(store.claimRows.get(1).txHash, TX);
  assert.equal(store.bountyRows.get('0xb1').status, BOUNTY_STATUS.RESOLVED);
  assert.equal(store.bountyRows.get('0xb1').txHash, TX);
});

test('a stolen lease re-checks the chain before re-sending', async () => {
  // The crash window that matters: the transaction confirmed but the process
  // died before recording it, leaving claim=processing + bounty=resolving.
  // The steal must verify on-chain instead of blindly paying again.
  const store = createPayoutStore({
    claims: [{ id: 1, status: CLAIM_STATUS.PROCESSING }],
    bounties: [
      { bountyId: '0xb1', status: BOUNTY_STATUS.RESOLVING, updatedAt: NOW - RESOLVING_LEASE_MS - 1 }
    ]
  });
  let sends = 0;
  const deps = depsFor(
    store,
    () => {
      sends += 1;
      return { success: true, txHash: '0xother' };
    },
    () => ({ status: BOUNTY_STATUS.RESOLVED, recipient: ADDR, txHash: TX })
  );

  const result = await settleClaim(
    { claimId: 1, bountyId: '0xb1', recipientAddress: ADDR, nowMs: NOW },
    deps
  );

  assert.deepEqual(result, { outcome: 'paid', txHash: TX, reconciled: true });
  assert.equal(sends, 0);
  assert.equal(store.claimRows.get(1).status, CLAIM_STATUS.PAID);
  assert.equal(store.claimRows.get(1).txHash, TX);
  assert.equal(store.bountyRows.get('0xb1').status, BOUNTY_STATUS.RESOLVED);
});

test('an on-chain refunded bounty fails without sending', async () => {
  const store = createPayoutStore({
    claims: [{ id: 1, status: CLAIM_STATUS.PENDING }],
    bounties: [{ bountyId: '0xb1', status: BOUNTY_STATUS.OPEN, updatedAt: NOW }]
  });
  let sends = 0;
  const deps = depsFor(
    store,
    () => {
      sends += 1;
      return { success: true, txHash: TX };
    },
    () => BOUNTY_STATUS.REFUNDED
  );

  const result = await settleClaim(
    { claimId: 1, bountyId: '0xb1', recipientAddress: ADDR, nowMs: NOW },
    deps
  );

  assert.deepEqual(result, {
    outcome: 'failed',
    reason: PAYOUT_FAILURE.NOT_PAYABLE_ONCHAIN,
    error: 'Bounty is refunded on-chain; payout not possible',
    publicError: 'This bounty was refunded to the sponsor and can no longer be paid out.'
  });
  assert.equal(sends, 0);
  assert.equal(store.claimRows.get(1).status, CLAIM_STATUS.FAILED);
  // Never back to `open`: the feed would advertise money that is gone.
  assert.equal(store.bountyRows.get('0xb1').status, BOUNTY_STATUS.REFUNDED);
});

test('an unreadable chain fails open toward liveness', async () => {
  const store = createPayoutStore({
    claims: [{ id: 1, status: CLAIM_STATUS.PENDING }],
    bounties: [{ bountyId: '0xb1', status: BOUNTY_STATUS.OPEN, updatedAt: NOW }]
  });
  let sends = 0;
  const deps = depsFor(
    store,
    () => {
      sends += 1;
      return { success: true, txHash: TX };
    },
    () => {
      throw new Error('rpc down');
    }
  );

  const result = await settleClaim(
    { claimId: 1, bountyId: '0xb1', recipientAddress: ADDR, nowMs: NOW },
    deps
  );

  assert.equal(result.outcome, 'paid');
  assert.equal(sends, 1);
});

test('a stale worker cannot release a lease that was stolen from it (fencing)', async () => {
  // Worker A outlives its lease mid-send. Worker B steals it and is itself
  // mid-send when A's send fails. Without fencing, A's release would flip the
  // bounty back to `open` under B, and a third attempt would send again.
  const store = createPayoutStore({
    claims: [
      { id: 1, bountyId: '0xb1', status: CLAIM_STATUS.PENDING },
      { id: 2, bountyId: '0xb1', status: CLAIM_STATUS.PENDING }
    ],
    bounties: [{ bountyId: '0xb1', status: BOUNTY_STATUS.OPEN, updatedAt: NOW }]
  });
  const sendA = deferred();
  const sendB = deferred();
  let sends = 0;
  const sender = (id, recipient) => {
    sends += 1;
    return recipient === ADDR ? sendA.promise : sendB.promise;
  };
  const OTHER = '0x2222222222222222222222222222222222222222';
  const later = NOW + RESOLVING_LEASE_MS + 1;

  const a = settleClaim({ claimId: 1, bountyId: '0xb1', recipientAddress: ADDR, nowMs: NOW }, depsFor(store, sender));
  await new Promise((r) => setImmediate(r));
  const b = settleClaim({ claimId: 2, bountyId: '0xb1', recipientAddress: OTHER, nowMs: later }, depsFor(store, sender));
  await new Promise((r) => setImmediate(r));

  sendA.resolve({ success: false, error: 'execution reverted: NotOpen()' });
  await a;
  assert.equal(store.bountyRows.get('0xb1').status, BOUNTY_STATUS.RESOLVING, 'A must not release B\'s lease');

  const c = await settleClaim(
    { claimId: 1, bountyId: '0xb1', recipientAddress: ADDR, nowMs: later + 1 },
    depsFor(store, sender)
  );
  assert.deepEqual(c, { outcome: 'skipped', reason: 'bounty-not-acquirable' });

  sendB.resolve({ success: true, txHash: TX });
  assert.equal((await b).outcome, 'paid');
  assert.equal(sends, 2);
  assert.equal(store.bountyRows.get('0xb1').status, BOUNTY_STATUS.RESOLVED);
  assert.equal(store.claimRows.get(2).status, CLAIM_STATUS.PAID);
});

test('the hash is pinned at broadcast, so a sender that dies mid-wait leaves it behind', async () => {
  // A throw after broadcast (dropped RPC, killed function) is not a failed
  // send: the transaction may still mine. Hold both leases with the hash.
  const store = createPayoutStore({
    claims: [{ id: 1, status: CLAIM_STATUS.PENDING }],
    bounties: [{ bountyId: '0xb1', status: BOUNTY_STATUS.OPEN, updatedAt: NOW }]
  });
  let pinnedBeforeWait = null;
  const sender = async (id, recipient, { onTxHash }) => {
    await onTxHash(TX);
    pinnedBeforeWait = store.claimRows.get(1).txHash;
    throw new Error('socket hang up');
  };

  const result = await settleClaim(
    { claimId: 1, bountyId: '0xb1', recipientAddress: ADDR, nowMs: NOW },
    depsFor(store, sender)
  );

  assert.equal(pinnedBeforeWait, TX);
  assert.deepEqual(result, { outcome: 'pending', txHash: TX, reason: 'unconfirmed' });
  assert.equal(store.claimRows.get(1).status, CLAIM_STATUS.PROCESSING);
  assert.equal(store.bountyRows.get('0xb1').status, BOUNTY_STATUS.RESOLVING);
});

test('recovery verifies the pinned hash, which proves payment even after a wallet change', async () => {
  // The contributor re-linked a new wallet after the crash. The recipient no
  // longer matches, but the pinned transaction is this claim's own send.
  const OLD = '0x3333333333333333333333333333333333333333';
  const store = createPayoutStore({
    claims: [{ id: 1, bountyId: '0xb1', status: CLAIM_STATUS.PROCESSING, txHash: TX }],
    bounties: [
      { bountyId: '0xb1', status: BOUNTY_STATUS.RESOLVING, updatedAt: NOW - RESOLVING_LEASE_MS - 1 }
    ]
  });
  let readerSaw = null;
  const reader = (id, options) => {
    readerSaw = options;
    return { status: BOUNTY_STATUS.RESOLVED, recipient: OLD, txHash: TX };
  };
  let sends = 0;

  const result = await settleClaim(
    { claimId: 1, bountyId: '0xb1', recipientAddress: ADDR, nowMs: NOW },
    depsFor(store, () => { sends += 1; return { success: true, txHash: '0xnew' }; }, reader)
  );

  assert.deepEqual(readerSaw, { txHash: TX });
  assert.deepEqual(result, { outcome: 'paid', txHash: TX, reconciled: true });
  assert.equal(sends, 0);
  assert.equal(store.claimRows.get(1).status, CLAIM_STATUS.PAID);
  assert.equal(store.bountyRows.get('0xb1').status, BOUNTY_STATUS.RESOLVED);
});

test('stealing a lease closes the dead worker\'s claim and attributes its mined payment', async () => {
  // The dead worker was paying claim 2 and its transaction mined. Claim 1
  // arrives later from the same author's wallet. The payment belongs to the
  // claim that owns the transaction, and is never counted twice.
  const store = createPayoutStore({
    claims: [
      { id: 1, bountyId: '0xb1', status: CLAIM_STATUS.PENDING },
      { id: 2, bountyId: '0xb1', status: CLAIM_STATUS.PROCESSING, txHash: TX }
    ],
    bounties: [
      { bountyId: '0xb1', status: BOUNTY_STATUS.RESOLVING, updatedAt: NOW - RESOLVING_LEASE_MS - 1 }
    ]
  });
  let sends = 0;

  const result = await settleClaim(
    { claimId: 1, bountyId: '0xb1', recipientAddress: ADDR, nowMs: NOW },
    depsFor(
      store,
      () => { sends += 1; return { success: true, txHash: '0xnew' }; },
      () => ({ status: BOUNTY_STATUS.RESOLVED, recipient: ADDR, txHash: TX })
    )
  );

  assert.equal(result.outcome, 'failed');
  assert.equal(result.reason, PAYOUT_FAILURE.RESOLVED_ELSEWHERE);
  assert.equal(sends, 0);
  assert.equal(store.claimRows.get(2).status, CLAIM_STATUS.PAID);
  assert.equal(store.claimRows.get(1).status, CLAIM_STATUS.FAILED);
  assert.equal(store.bountyRows.get('0xb1').status, BOUNTY_STATUS.RESOLVED);
  assert.equal(store.bountyRows.get('0xb1').txHash, TX);
});

test('stealing a lease fails the dead worker\'s unsent claim so it is never stuck processing', async () => {
  const store = createPayoutStore({
    claims: [
      { id: 1, bountyId: '0xb1', status: CLAIM_STATUS.PENDING },
      { id: 2, bountyId: '0xb1', status: CLAIM_STATUS.PROCESSING }
    ],
    bounties: [
      { bountyId: '0xb1', status: BOUNTY_STATUS.RESOLVING, updatedAt: NOW - RESOLVING_LEASE_MS - 1 }
    ]
  });

  const result = await settleClaim(
    { claimId: 1, bountyId: '0xb1', recipientAddress: ADDR, nowMs: NOW },
    depsFor(store, () => ({ success: true, txHash: TX }))
  );

  assert.equal(result.outcome, 'paid');
  assert.equal(store.claimRows.get(1).status, CLAIM_STATUS.PAID);
  assert.equal(store.claimRows.get(2).status, CLAIM_STATUS.FAILED);
  assert.equal(store.bountyRows.get('0xb1').status, BOUNTY_STATUS.RESOLVED);
});

test('send failures never publish provider text; known escrow reverts get a real sentence', async () => {
  // ethers errors embed the RPC URL, which commonly carries an API key. The
  // raw text stays in `error` for the server log; `publicError` is all a
  // user or a GitHub comment ever sees.
  const leaky = 'could not coalesce error (url="https://base.example/v2/SECRET_KEY_123", body=...)';
  const leakStore = createPayoutStore({
    claims: [{ id: 1, status: CLAIM_STATUS.PENDING }],
    bounties: [{ bountyId: '0xb1', status: BOUNTY_STATUS.OPEN, updatedAt: NOW }]
  });
  const leak = await settleClaim(
    { claimId: 1, bountyId: '0xb1', recipientAddress: ADDR, nowMs: NOW },
    depsFor(leakStore, () => ({ success: false, error: leaky }))
  );
  assert.equal(leak.reason, PAYOUT_FAILURE.SEND_FAILED);
  assert.equal(leak.error, leaky);
  assert.equal(leak.publicError, null);

  const revertStore = createPayoutStore({
    claims: [{ id: 1, status: CLAIM_STATUS.PENDING }],
    bounties: [{ bountyId: '0xb1', status: BOUNTY_STATUS.OPEN, updatedAt: NOW }]
  });
  const revert = await settleClaim(
    { claimId: 1, bountyId: '0xb1', recipientAddress: ADDR, nowMs: NOW },
    depsFor(revertStore, () => ({ success: false, error: 'execution reverted: DeadlinePassed()' }))
  );
  assert.match(revert.publicError, /passed its deadline/);
  assert.doesNotMatch(revert.publicError, /execution reverted/);
});

test('an earlier send still in the mempool blocks a second send', async () => {
  // A second send from the same resolver queues behind the first on nonce
  // and can only revert once the first mines. Wait instead.
  const store = createPayoutStore({
    claims: [{ id: 1, bountyId: '0xb1', status: CLAIM_STATUS.PROCESSING, txHash: TX }],
    bounties: [
      { bountyId: '0xb1', status: BOUNTY_STATUS.RESOLVING, updatedAt: NOW - RESOLVING_LEASE_MS - 1 }
    ]
  });
  let sends = 0;

  const result = await settleClaim(
    { claimId: 1, bountyId: '0xb1', recipientAddress: ADDR, nowMs: NOW },
    depsFor(
      store,
      () => { sends += 1; return { success: true, txHash: '0xsecond' }; },
      () => ({ status: BOUNTY_STATUS.OPEN, recipient: null, txHash: null, pinnedPending: true })
    )
  );

  assert.deepEqual(result, { outcome: 'pending', txHash: TX, reason: 'earlier-send-pending' });
  assert.equal(sends, 0);
  assert.equal(store.claimRows.get(1).txHash, TX, 'the first hash is never overwritten');
  assert.equal(store.claimRows.get(1).status, CLAIM_STATUS.PROCESSING);
  assert.equal(store.bountyRows.get('0xb1').status, BOUNTY_STATUS.RESOLVING);
});

test('a send that loses the race re-reads the chain instead of reopening the bounty', async () => {
  // Our send reverted NotOpen because an earlier transaction to this same
  // claimant mined first. Reopening would strand a paid claim as `failed`.
  const store = createPayoutStore({
    claims: [{ id: 1, bountyId: '0xb1', status: CLAIM_STATUS.FAILED }],
    bounties: [{ bountyId: '0xb1', status: BOUNTY_STATUS.OPEN, updatedAt: NOW }]
  });
  let reads = 0;
  const reader = () => {
    reads += 1;
    return reads === 1
      ? { status: BOUNTY_STATUS.OPEN, recipient: null, txHash: null }
      : { status: BOUNTY_STATUS.RESOLVED, recipient: ADDR, txHash: TX };
  };

  const result = await settleClaim(
    { claimId: 1, bountyId: '0xb1', recipientAddress: ADDR, nowMs: NOW },
    depsFor(store, () => ({ success: false, error: 'Escrow reverted: NotOpen()' }), reader)
  );

  assert.deepEqual(result, { outcome: 'paid', txHash: TX, reconciled: true });
  assert.equal(store.claimRows.get(1).status, CLAIM_STATUS.PAID);
  assert.equal(store.bountyRows.get('0xb1').status, BOUNTY_STATUS.RESOLVED);
});

test('a send that loses the race to another claim closes the bounty and fails this claim', async () => {
  const OTHER = '0x2222222222222222222222222222222222222222';
  const store = createPayoutStore({
    claims: [{ id: 1, bountyId: '0xb1', status: CLAIM_STATUS.PENDING }],
    bounties: [{ bountyId: '0xb1', status: BOUNTY_STATUS.OPEN, updatedAt: NOW }]
  });
  let reads = 0;
  const reader = () => {
    reads += 1;
    return reads === 1
      ? { status: BOUNTY_STATUS.OPEN, recipient: null, txHash: null }
      : { status: BOUNTY_STATUS.RESOLVED, recipient: OTHER, txHash: TX };
  };

  const result = await settleClaim(
    { claimId: 1, bountyId: '0xb1', recipientAddress: ADDR, nowMs: NOW },
    depsFor(store, () => ({ success: false, error: 'Escrow reverted: NotOpen()' }), reader)
  );

  assert.equal(result.reason, PAYOUT_FAILURE.RESOLVED_ELSEWHERE);
  assert.equal(store.claimRows.get(1).status, CLAIM_STATUS.FAILED);
  assert.equal(store.bountyRows.get('0xb1').status, BOUNTY_STATUS.RESOLVED, 'never reopened');
});

test('unknown attribution on a stolen lease leaves the dead worker\'s claim untouched', async () => {
  // Closing a stranded claim without knowing who was paid could fail the
  // one claim that actually received the money.
  const store = createPayoutStore({
    claims: [
      { id: 1, bountyId: '0xb1', status: CLAIM_STATUS.PENDING },
      { id: 2, bountyId: '0xb1', status: CLAIM_STATUS.PROCESSING, txHash: TX }
    ],
    bounties: [
      { bountyId: '0xb1', status: BOUNTY_STATUS.RESOLVING, updatedAt: NOW - RESOLVING_LEASE_MS - 1 }
    ]
  });

  const result = await settleClaim(
    { claimId: 1, bountyId: '0xb1', recipientAddress: ADDR, nowMs: NOW },
    depsFor(store, () => ({ success: true, txHash: '0xnew' }), () => ({ status: BOUNTY_STATUS.RESOLVED }))
  );

  assert.equal(result.reason, 'attribution-unknown');
  assert.equal(store.claimRows.get(2).status, CLAIM_STATUS.PROCESSING);
  assert.equal(store.claimRows.get(2).txHash, TX);
});
