import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isValidEmail } from '../lib/validation.js';

test('isValidEmail accepts normal addresses', () => {
  assert.equal(isValidEmail('user@example.com'), true);
  assert.equal(isValidEmail('first.last+tag@sub.example.co.uk'), true);
});

test('isValidEmail rejects malformed input', () => {
  assert.equal(isValidEmail(''), false);
  assert.equal(isValidEmail(null), false);
  assert.equal(isValidEmail(undefined), false);
  assert.equal(isValidEmail(42), false);
  assert.equal(isValidEmail('no-at-sign'), false);
  assert.equal(isValidEmail('foo@bar'), false);
  assert.equal(isValidEmail('foo @bar.com'), false);
});

test('isValidEmail trims whitespace before checking', () => {
  assert.equal(isValidEmail('  user@example.com  '), true);
});
