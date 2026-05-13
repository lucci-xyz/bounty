import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  BOUNTY_STATUS,
  isValidStatus,
  isTerminalStatus,
  contractStatusToDb,
  getStatusLabel,
  deriveLifecycle,
  isRefundEligible
} from '../lib/status/index.js';

test('BOUNTY_STATUS exposes the canonical states', () => {
  assert.deepEqual(BOUNTY_STATUS, { OPEN: 'open', RESOLVED: 'resolved', REFUNDED: 'refunded' });
});

test('isValidStatus accepts known states and rejects others', () => {
  assert.equal(isValidStatus('open'), true);
  assert.equal(isValidStatus('resolved'), true);
  assert.equal(isValidStatus('refunded'), true);
  assert.equal(isValidStatus('expired'), false);
  assert.equal(isValidStatus(''), false);
  assert.equal(isValidStatus(null), false);
});

test('isTerminalStatus identifies closed bounties', () => {
  assert.equal(isTerminalStatus('resolved'), true);
  assert.equal(isTerminalStatus('refunded'), true);
  assert.equal(isTerminalStatus('open'), false);
});

test('contractStatusToDb maps enum to string', () => {
  assert.equal(contractStatusToDb(0), null);
  assert.equal(contractStatusToDb(1), 'open');
  assert.equal(contractStatusToDb(2), 'resolved');
  assert.equal(contractStatusToDb(3), 'refunded');
  assert.equal(contractStatusToDb(99), null);
});

test('getStatusLabel returns capitalised label or "Unknown"', () => {
  assert.equal(getStatusLabel('open'), 'Open');
  assert.equal(getStatusLabel('mystery'), 'Unknown');
});

test('deriveLifecycle returns terminal states unchanged', () => {
  const lc = deriveLifecycle({ status: 'resolved', deadline: 100 }, 200);
  assert.equal(lc.state, 'resolved');
  assert.equal(lc.label, 'Resolved');
});

test('deriveLifecycle marks open-past-deadline as expired', () => {
  const lc = deriveLifecycle({ status: 'open', deadline: 100 }, 200);
  assert.equal(lc.state, 'expired');
  assert.equal(lc.secondsRemaining, 0);
  assert.equal(lc.expiredAt, 100);
});

test('deriveLifecycle keeps active bounties open', () => {
  const lc = deriveLifecycle({ status: 'open', deadline: 1000 }, 600);
  assert.equal(lc.state, 'open');
  assert.equal(lc.secondsRemaining, 400);
});

test('isRefundEligible only for open + expired', () => {
  assert.equal(isRefundEligible({ status: 'open', deadline: 100 }, 200), true);
  assert.equal(isRefundEligible({ status: 'open', deadline: 200 }, 100), false);
  assert.equal(isRefundEligible({ status: 'resolved', deadline: 100 }, 200), false);
});
