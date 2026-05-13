import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatAmount, TOKEN_DECIMALS } from '../lib/format/amount.js';

test('formatAmount handles USDC with default decimals', () => {
  assert.equal(formatAmount('1000000', 'USDC'), '1');
  assert.equal(formatAmount('1500000', 'USDC', { minimumFractionDigits: 2 }), '1.50');
});

test('formatAmount handles MUSD with 18 decimals', () => {
  assert.equal(TOKEN_DECIMALS.MUSD, 18);
  assert.equal(formatAmount('1000000000000000000', 'MUSD'), '1');
});

test('formatAmount returns "0" for null/undefined/NaN', () => {
  assert.equal(formatAmount(null, 'USDC'), '0');
  assert.equal(formatAmount(undefined, 'USDC'), '0');
  assert.equal(formatAmount('not-a-number', 'USDC'), '0');
});

test('formatAmount falls back to 6 decimals for unknown symbol', () => {
  assert.equal(formatAmount('1000000', 'UNKNOWN'), '1');
});

test('formatAmount honors useGrouping option', () => {
  assert.equal(formatAmount('1000000000', 'USDC', { useGrouping: true }), '1,000');
});
