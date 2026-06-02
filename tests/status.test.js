import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  BOUNTY_STATUS,
  CONTRACT_STATUS_MAP,
  isValidStatus,
  isTerminalStatus,
  contractStatusToDb,
  getStatusLabel,
  deriveLifecycle,
  isRefundEligible
} from '../lib/status/index.js';

test('isValidStatus accepts canonical statuses and rejects others', () => {
  assert.equal(isValidStatus('open'), true);
  assert.equal(isValidStatus('resolved'), true);
  assert.equal(isValidStatus('refunded'), true);
  assert.equal(isValidStatus('cancelled'), false);
  assert.equal(isValidStatus(''), false);
  assert.equal(isValidStatus(undefined), false);
});

test('isTerminalStatus only treats resolved/refunded as terminal', () => {
  assert.equal(isTerminalStatus('resolved'), true);
  assert.equal(isTerminalStatus('refunded'), true);
  assert.equal(isTerminalStatus('open'), false);
  assert.equal(isTerminalStatus('expired'), false);
});

test('contractStatusToDb maps the on-chain enum exactly', () => {
  // enum Status { None=0, Open=1, Resolved=2, Refunded=3 }
  assert.equal(contractStatusToDb(0), null);
  assert.equal(contractStatusToDb(1), 'open');
  assert.equal(contractStatusToDb(2), 'resolved');
  assert.equal(contractStatusToDb(3), 'refunded');
  // accepts BigInt / numeric strings (ethers returns BigInt)
  assert.equal(contractStatusToDb(1n), 'open');
  assert.equal(contractStatusToDb('2'), 'resolved');
  // unknown values fall back to null
  assert.equal(contractStatusToDb(99), null);
});

test('CONTRACT_STATUS_MAP stays in sync with BOUNTY_STATUS', () => {
  assert.equal(CONTRACT_STATUS_MAP[1], BOUNTY_STATUS.OPEN);
  assert.equal(CONTRACT_STATUS_MAP[2], BOUNTY_STATUS.RESOLVED);
  assert.equal(CONTRACT_STATUS_MAP[3], BOUNTY_STATUS.REFUNDED);
});

test('getStatusLabel returns friendly labels with a safe fallback', () => {
  assert.equal(getStatusLabel('open'), 'Open');
  assert.equal(getStatusLabel('resolved'), 'Resolved');
  assert.equal(getStatusLabel('refunded'), 'Refunded');
  assert.equal(getStatusLabel('nonsense'), 'Unknown');
});

test('deriveLifecycle reports an active open bounty before the deadline', () => {
  const now = 1_000;
  const lifecycle = deriveLifecycle({ status: 'open', deadline: 1_100 }, now);
  assert.equal(lifecycle.state, 'open');
  assert.equal(lifecycle.label, 'Open');
  assert.equal(lifecycle.secondsRemaining, 100);
  assert.equal(lifecycle.deadline, 1_100);
});

test('deriveLifecycle keeps terminal statuses terminal regardless of deadline', () => {
  const now = 5_000;
  for (const status of ['resolved', 'refunded']) {
    const lifecycle = deriveLifecycle({ status, deadline: 1 }, now);
    assert.equal(lifecycle.state, status);
    assert.equal(lifecycle.secondsRemaining, 0);
  }
});

test('deriveLifecycle marks open bounties expired only strictly after the deadline', () => {
  const deadline = 2_000;
  // exactly at the deadline -> still resolvable on-chain, so NOT expired
  const atDeadline = deriveLifecycle({ status: 'open', deadline }, deadline);
  assert.equal(atDeadline.state, 'open');
  assert.equal(atDeadline.secondsRemaining, 0);

  // one second past the deadline -> expired
  const past = deriveLifecycle({ status: 'open', deadline }, deadline + 1);
  assert.equal(past.state, 'expired');
  assert.equal(past.label, 'Expired');
  assert.equal(past.expiredAt, deadline);
});

test('deriveLifecycle handles missing/invalid deadlines without throwing', () => {
  const lifecycle = deriveLifecycle({ status: 'open', deadline: undefined }, 1_000);
  assert.equal(lifecycle.state, 'open');
  assert.equal(lifecycle.secondsRemaining, null);
  assert.equal(lifecycle.deadline, null);
});

test('isRefundEligible mirrors the contract refundExpired guard (strictly past deadline)', () => {
  const deadline = 2_000;
  // not open -> never eligible
  assert.equal(isRefundEligible({ status: 'resolved', deadline }, deadline + 10), false);
  // open but before deadline -> not eligible
  assert.equal(isRefundEligible({ status: 'open', deadline }, deadline - 1), false);
  // open exactly at deadline -> NOT eligible (on-chain would revert DeadlineNotReached)
  assert.equal(isRefundEligible({ status: 'open', deadline }, deadline), false);
  // open strictly past deadline -> eligible
  assert.equal(isRefundEligible({ status: 'open', deadline }, deadline + 1), true);
});

test('isRefundEligible rejects bounties with no usable deadline', () => {
  assert.equal(isRefundEligible({ status: 'open', deadline: undefined }, 9_999), false);
  assert.equal(isRefundEligible({ status: 'open' }, 9_999), false);
});
