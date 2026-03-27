import test from 'node:test';
import assert from 'node:assert/strict';

import { assertExpectedSiweNonce } from '../server/auth/siweSession.js';

test('assertExpectedSiweNonce accepts the issued nonce', () => {
  assert.doesNotThrow(() => assertExpectedSiweNonce('abc123', 'abc123'));
});

test('assertExpectedSiweNonce rejects missing server nonce', () => {
  assert.throws(() => assertExpectedSiweNonce(undefined, 'abc123'), /Missing nonce/);
});

test('assertExpectedSiweNonce rejects mismatched nonce', () => {
  assert.throws(() => assertExpectedSiweNonce('abc123', 'xyz789'), /Invalid nonce/);
});
