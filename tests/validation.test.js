import { test } from 'node:test';
import assert from 'node:assert/strict';

import { isValidEmail } from '../lib/validation.js';
import {
  validateBytes32,
  validateAmount,
  validatePositiveNumber,
  validateTxHash
} from '../server/blockchain/validation.js';

test('isValidEmail accepts well-formed addresses', () => {
  assert.equal(isValidEmail('user@example.com'), true);
  assert.equal(isValidEmail('  trimmed@example.com  '), true);
  assert.equal(isValidEmail('a.b+tag@sub.domain.io'), true);
});

test('isValidEmail rejects malformed addresses and non-strings', () => {
  assert.equal(isValidEmail('no-at-sign'), false);
  assert.equal(isValidEmail('two@@example.com'), false);
  assert.equal(isValidEmail('missing@tld'), false);
  assert.equal(isValidEmail('spaces in@example.com'), false);
  assert.equal(isValidEmail(''), false);
  assert.equal(isValidEmail(null), false);
  assert.equal(isValidEmail(42), false);
});

test('validateBytes32 accepts a 32-byte hex string and lowercases it', () => {
  const value = '0x' + 'AB'.repeat(32);
  assert.equal(validateBytes32(value), value.toLowerCase());
});

test('validateBytes32 rejects wrong lengths, missing prefix, and bad chars', () => {
  assert.throws(() => validateBytes32('0x' + 'ab'.repeat(31)), /Invalid/);
  assert.throws(() => validateBytes32('ab'.repeat(32)), /Invalid/);
  assert.throws(() => validateBytes32('0x' + 'zz'.repeat(32)), /Invalid/);
  assert.throws(() => validateBytes32(''), /required/);
  assert.throws(() => validateBytes32(null), /required/);
});

test('validateAmount accepts positive integer strings only', () => {
  assert.equal(validateAmount('1000000'), '1000000');
  assert.throws(() => validateAmount('0'), /greater than 0/);
  assert.throws(() => validateAmount('1.5'), /Invalid/);
  assert.throws(() => validateAmount('-5'), /Invalid/);
  assert.throws(() => validateAmount(''), /required/);
  assert.throws(() => validateAmount(1000), /must be a string/);
});

test('validatePositiveNumber parses strings and rejects non-positive values', () => {
  assert.equal(validatePositiveNumber('5'), 5);
  assert.equal(validatePositiveNumber(2.5), 2.5);
  assert.throws(() => validatePositiveNumber(0), /positive/);
  assert.throws(() => validatePositiveNumber(-1), /positive/);
  assert.throws(() => validatePositiveNumber('abc'), /positive/);
});

test('validateTxHash validates a 32-byte hash and normalises case', () => {
  const hash = '0x' + 'CD'.repeat(32);
  assert.equal(validateTxHash(hash), hash.toLowerCase());
  assert.throws(() => validateTxHash('0x123'), /Invalid/);
  assert.throws(() => validateTxHash(null), /required/);
});
