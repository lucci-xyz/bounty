import { test } from 'node:test';
import assert from 'node:assert/strict';

import { decideAllowlist } from '../lib/allowlistDecision.js';

const ADDR = '0x1111111111111111111111111111111111111111';
const OTHER = '0x2222222222222222222222222222222222222222';

test('no entries means the bounty is unrestricted, not closed to everyone', () => {
  // The rule that makes this safe to enforce on the payout path. Returning
  // "denied" here would stop every payout on every bounty without an allowlist.
  for (const empty of [[], null, undefined]) {
    assert.deepEqual(decideAllowlist(empty, ADDR), { allowed: true, restricted: false });
  }
});

test('an address on the list is allowed', () => {
  const result = decideAllowlist([{ allowedAddress: ADDR }], ADDR);
  assert.deepEqual(result, { allowed: true, restricted: true });
});

test('an address off the list is refused once a restriction exists', () => {
  const result = decideAllowlist([{ allowedAddress: OTHER }], ADDR);
  assert.deepEqual(result, { allowed: false, restricted: true });
});

test('matching ignores case and surrounding whitespace', () => {
  assert.equal(decideAllowlist([{ allowedAddress: ADDR.toUpperCase() }], ADDR).allowed, true);
  assert.equal(decideAllowlist([{ allowedAddress: `  ${ADDR}  ` }], ADDR).allowed, true);
  assert.equal(decideAllowlist([{ allowedAddress: ADDR }], ADDR.toUpperCase()).allowed, true);
});

test('a restricted bounty refuses an empty or missing recipient', () => {
  for (const bad of ['', null, undefined, '   ']) {
    assert.deepEqual(decideAllowlist([{ allowedAddress: ADDR }], bad), {
      allowed: false,
      restricted: true
    });
  }
});

test('any one matching entry is enough', () => {
  const entries = [{ allowedAddress: OTHER }, { allowedAddress: ADDR }];
  assert.equal(decideAllowlist(entries, ADDR).allowed, true);
});

test('malformed entries do not grant access', () => {
  assert.equal(decideAllowlist([{}, { allowedAddress: null }], ADDR).allowed, false);
});
