import { test } from 'node:test';
import assert from 'node:assert/strict';

import { toPublicBounty, toPublicBounties } from '../lib/publicBounty.js';

const ROW = {
  bountyId: '0xabc',
  repoFullName: 'acme/api',
  issueNumber: 42,
  sponsorGithubId: 583231,
  sponsorAddress: '0x1111111111111111111111111111111111111111',
  amount: '5000000000',
  status: 'open'
};

test('strips sponsorGithubId', () => {
  const out = toPublicBounty(ROW);
  assert.equal('sponsorGithubId' in out, false);
});

test('keeps fields the public feed needs', () => {
  const out = toPublicBounty(ROW);
  assert.equal(out.bountyId, '0xabc');
  assert.equal(out.amount, '5000000000');
  assert.equal(out.issueNumber, 42);
  // sponsorAddress is already public on-chain and some flows compare it.
  assert.equal(out.sponsorAddress, ROW.sponsorAddress);
});

test('does not mutate the input row', () => {
  const row = { ...ROW };
  toPublicBounty(row);
  assert.equal(row.sponsorGithubId, 583231, 'caller-owned object must be untouched');
});

test('toPublicBounties redacts every row', () => {
  const out = toPublicBounties([ROW, { ...ROW, sponsorGithubId: 9 }]);
  assert.equal(out.length, 2);
  for (const row of out) {
    assert.equal('sponsorGithubId' in row, false);
  }
});

test('tolerates empty and non-array input', () => {
  assert.deepEqual(toPublicBounties([]), []);
  assert.deepEqual(toPublicBounties(null), []);
  assert.deepEqual(toPublicBounties(undefined), []);
  assert.equal(toPublicBounty(null), null);
});
