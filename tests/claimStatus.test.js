import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  CLAIM_STATUS,
  SETTLEABLE_CLAIM_STATUSES,
  UNPAID_CLAIM_STATUSES,
  isPaidClaim,
  isSettleableClaim,
  describeClaimStatus,
  describeSettledPayouts
} from '../lib/claimStatus.js';

test('claim status values match what the database stores', () => {
  assert.deepEqual(CLAIM_STATUS, {
    PENDING: 'pending',
    PENDING_WALLET: 'pending_wallet',
    FAILED: 'failed',
    PAID: 'paid'
  });
});

test('a merged-but-unpaid claim is settleable by its contributor', () => {
  // pending_wallet is what the merge handler records when the contributor had
  // no wallet linked. It was previously excluded here, which left the payout
  // stranded: the retry endpoint refused it and nothing else ever paid it.
  assert.equal(isSettleableClaim('pending_wallet'), true);
  assert.equal(isSettleableClaim('failed'), true);
});

test('an unmerged claim is never settleable by its contributor', () => {
  // `pending` means the PR has not been through the merge gate. Letting a
  // contributor trigger settlement from it would pay for unmerged work.
  assert.equal(isSettleableClaim('pending'), false);
  assert.equal(isSettleableClaim('paid'), false);
  assert.equal(isSettleableClaim('resolved'), false);
  assert.equal(isSettleableClaim(undefined), false);
  assert.equal(isSettleableClaim('PENDING_WALLET'), false);
});

test('the merge path may settle any unpaid claim, and only unpaid ones', () => {
  assert.deepEqual([...UNPAID_CLAIM_STATUSES].sort(), ['failed', 'pending', 'pending_wallet']);
  assert.deepEqual([...SETTLEABLE_CLAIM_STATUSES].sort(), ['failed', 'pending_wallet']);
  for (const status of SETTLEABLE_CLAIM_STATUSES) {
    assert.equal(UNPAID_CLAIM_STATUSES.has(status), true);
  }
});

test('isPaidClaim accepts the legacy "resolved" spelling', () => {
  assert.equal(isPaidClaim('paid'), true);
  assert.equal(isPaidClaim('resolved'), true);
  assert.equal(isPaidClaim('pending_wallet'), false);
  assert.equal(isPaidClaim('failed'), false);
  assert.equal(isPaidClaim(null), false);
});

test('an unpaid claim is never labelled Paid', () => {
  // The earnings list fell through to "Paid" for any status it did not
  // recognise, so a contributor stuck in pending_wallet was told they had been
  // paid while their bounty sat in escrow.
  for (const status of ['pending', 'pending_wallet', 'failed', 'processing', '', undefined]) {
    assert.notEqual(describeClaimStatus(status).label, 'Paid', `status ${String(status)}`);
    assert.notEqual(describeClaimStatus(status).tone, 'success', `status ${String(status)}`);
  }
});

test('describeClaimStatus gives each status a label, tone and action', () => {
  assert.deepEqual(describeClaimStatus('paid'), { label: 'Paid', tone: 'success', actionLabel: null });
  assert.deepEqual(describeClaimStatus('resolved'), { label: 'Paid', tone: 'success', actionLabel: null });
  assert.deepEqual(describeClaimStatus('pending'), { label: 'Pending', tone: 'pending', actionLabel: null });
  assert.deepEqual(describeClaimStatus('pending_wallet'), {
    label: 'Unclaimed',
    tone: 'warning',
    actionLabel: 'Collect payout'
  });
  assert.deepEqual(describeClaimStatus('failed'), { label: 'Failed', tone: 'error', actionLabel: 'Retry payout' });
  assert.deepEqual(describeClaimStatus('something_new'), { label: 'Unknown', tone: 'muted', actionLabel: null });
});

test('only settleable claims offer an action', () => {
  for (const status of ['pending', 'pending_wallet', 'failed', 'paid', 'resolved', 'x']) {
    assert.equal(describeClaimStatus(status).actionLabel !== null, isSettleableClaim(status), status);
  }
});

const paid = (overrides = {}) => ({
  claimId: 1,
  outcome: 'paid',
  repoFullName: 'acme/widgets',
  issueNumber: 3,
  amount: '50000000',
  tokenSymbol: 'USDC',
  txHash: '0xabc',
  ...overrides
});

test('describeSettledPayouts says nothing when linking settled nothing', () => {
  assert.equal(describeSettledPayouts([]), null);
  assert.equal(describeSettledPayouts(undefined), null);
  assert.equal(describeSettledPayouts([{ claimId: 1, outcome: 'skipped', reason: 'bounty_not_open' }]), null);
});

test('describeSettledPayouts names what was paid', () => {
  assert.equal(describeSettledPayouts([paid()]), 'Paid 50 USDC for acme/widgets#3.');
  assert.equal(
    describeSettledPayouts([
      paid(),
      paid({ claimId: 2, issueNumber: 9, amount: '1500000000000000000', tokenSymbol: 'MUSD' })
    ]),
    'Paid 2 bounties: 50 USDC for acme/widgets#3, 1.5 MUSD for acme/widgets#9.'
  );
});

test('describeSettledPayouts points to the dashboard for anything that did not go through', () => {
  assert.equal(
    describeSettledPayouts([paid(), { claimId: 2, outcome: 'chain_failed' }]),
    'Paid 50 USDC for acme/widgets#3. 1 payout could not be sent; retry it from your dashboard.'
  );
  assert.equal(
    describeSettledPayouts([
      { claimId: 2, outcome: 'chain_failed' },
      { claimId: 3, outcome: 'not_allowlisted' }
    ]),
    '2 payouts could not be sent; retry them from your dashboard.'
  );
  // Deferred for time: not failed, but the contributor still has to act.
  assert.equal(
    describeSettledPayouts([paid(), { claimId: 2, outcome: 'deferred' }]),
    'Paid 50 USDC for acme/widgets#3. 1 payout could not be sent; retry it from your dashboard.'
  );
});

test('describeSettledPayouts reports a closed window rather than inviting a retry', () => {
  assert.equal(
    describeSettledPayouts([{ claimId: 2, outcome: 'window_closed', repoFullName: 'acme/widgets', issueNumber: 4 }]),
    'The payout window for acme/widgets#4 has closed.'
  );
});
