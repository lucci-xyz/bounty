import { test } from 'node:test';
import assert from 'node:assert/strict';

import { formatAmount, TOKEN_DECIMALS } from '../lib/format/amount.js';
import { formatStarCount } from '../lib/format/stars.js';
import { capitalizeFirst } from '../lib/format/text.js';
import { encodeBadgeSegment, buildShieldsBadge, buildBadgeLink } from '../lib/format/badge.js';
import { formatTimeLeft, formatTimeRemaining, formatDeadlineDate } from '../lib/format/time.js';

test('TOKEN_DECIMALS encodes the supported tokens', () => {
  assert.equal(TOKEN_DECIMALS.USDC, 6);
  assert.equal(TOKEN_DECIMALS.MUSD, 18);
});

test('formatAmount converts USDC base units (6 decimals)', () => {
  assert.equal(formatAmount('1000000', 'USDC'), '1');
  assert.equal(formatAmount('1500000', 'USDC', { maximumFractionDigits: 2 }), '1.5');
  assert.equal(formatAmount(2500000, 'USDC', { minimumFractionDigits: 2 }), '2.50');
});

test('formatAmount converts MUSD base units (18 decimals)', () => {
  assert.equal(formatAmount('1000000000000000000', 'MUSD'), '1');
  assert.equal(
    formatAmount('2500000000000000000', 'MUSD', { maximumFractionDigits: 2 }),
    '2.5'
  );
});

test('formatAmount defaults unknown tokens to 6 decimals', () => {
  assert.equal(formatAmount('1000000', 'WAT'), '1');
});

test('formatAmount returns "0" for nullish or non-finite input', () => {
  assert.equal(formatAmount(null, 'USDC'), '0');
  assert.equal(formatAmount(undefined, 'USDC'), '0');
  assert.equal(formatAmount('not-a-number', 'USDC'), '0');
});

test('formatAmount honours an explicit decimals override', () => {
  assert.equal(formatAmount('100', 'USDC', { decimals: 2 }), '1');
});

test('formatStarCount abbreviates thousands and handles nullish input', () => {
  assert.equal(formatStarCount(0), '0');
  assert.equal(formatStarCount(999), '999');
  assert.equal(formatStarCount(1000), '1.0k');
  assert.equal(formatStarCount(1500), '1.5k');
  assert.equal(formatStarCount(null), '0');
  assert.equal(formatStarCount(undefined), '0');
});

test('capitalizeFirst capitalizes only the first character', () => {
  assert.equal(capitalizeFirst('open'), 'Open');
  assert.equal(capitalizeFirst('a'), 'A');
  assert.equal(capitalizeFirst(''), '');
  assert.equal(capitalizeFirst('alreadyCapitalCamel'), 'AlreadyCapitalCamel');
});

test('encodeBadgeSegment escapes dashes per shields.io rules', () => {
  assert.equal(encodeBadgeSegment('a-b'), 'a--b');
  assert.equal(encodeBadgeSegment('hello world'), 'hello%20world');
});

test('buildShieldsBadge builds a markdown image and requires a baseUrl', () => {
  const badge = buildShieldsBadge({
    baseUrl: 'https://img.shields.io/badge',
    label: 'bounty',
    value: '$100'
  });
  assert.match(badge, /^!\[bounty \$100\]\(https:\/\/img\.shields\.io\/badge\/bounty-/);
  assert.match(badge, /style=for-the-badge/);
  assert.throws(() => buildShieldsBadge({ label: 'x', value: 'y' }), /requires a baseUrl/);
});

test('buildBadgeLink wraps markdown in a link and degrades gracefully', () => {
  assert.equal(buildBadgeLink('![x](y)', 'https://e.com'), '[![x](y)](https://e.com)');
  assert.equal(buildBadgeLink('![x](y)', ''), '![x](y)');
  assert.equal(buildBadgeLink('', 'https://e.com'), '');
});

test('formatTimeLeft summarises the time until a deadline', () => {
  const now = Date.now();
  // Add slack so flooring stays stable across the elapsed test time.
  const inDays = Math.floor((now + (3 * 24 + 1) * 3600 * 1000) / 1000);
  const inHours = Math.floor((now + (5 * 3600 + 30 * 60) * 1000) / 1000);
  const soon = Math.floor((now + 30 * 60 * 1000) / 1000);
  const past = Math.floor((now - 3600 * 1000) / 1000);

  assert.equal(formatTimeLeft(inDays), '3d');
  assert.equal(formatTimeLeft(inHours), '5h');
  assert.equal(formatTimeLeft(soon), '< 1h');
  assert.equal(formatTimeLeft(past), 'Expired');
  assert.equal(formatTimeLeft(null), '-');
});

test('formatTimeRemaining expands the short labels into prose', () => {
  const now = Date.now();
  const inOneDay = Math.floor((now + 1.2 * 24 * 3600 * 1000) / 1000);
  const inTwoDays = Math.floor((now + 2.2 * 24 * 3600 * 1000) / 1000);
  const inOneHour = Math.floor((now + 1.2 * 3600 * 1000) / 1000);
  const soon = Math.floor((now + 20 * 60 * 1000) / 1000);

  assert.equal(formatTimeRemaining(inOneDay), '1 day');
  assert.equal(formatTimeRemaining(inTwoDays), '2 days');
  assert.equal(formatTimeRemaining(inOneHour), '1 hour');
  assert.equal(formatTimeRemaining(soon), 'Less than 1h');
  assert.equal(formatTimeRemaining(null), 'Unknown');
});

test('formatDeadlineDate renders a date and guards against bad input', () => {
  // 2021-01-01T00:00:00Z = 1609459200 (assert on year to stay timezone-agnostic)
  assert.match(formatDeadlineDate(1609459200, { locale: 'en-US' }), /2020|2021/);
  assert.equal(formatDeadlineDate(null), '-');
  assert.equal(formatDeadlineDate('not-a-date'), '-');
});

/**
 * Money-display regression guards.
 *
 * formatAmount previously defaulted maximumFractionDigits to
 * minimumFractionDigits (0), so a bare call rounded every amount to whole
 * units: a paid 0.40 USDC bounty rendered as "0" on the Earnings tab.
 */

test('formatAmount does not round sub-unit amounts to zero', () => {
  assert.equal(formatAmount('400000', 'USDC'), '0.4');
  assert.equal(formatAmount('10000', 'USDC'), '0.01');
});

test('formatAmount does not round half-units up to the next whole unit', () => {
  assert.equal(formatAmount('2500000', 'USDC'), '2.5');
});

test('formatAmount keeps whole amounts clean', () => {
  assert.equal(formatAmount('5000000', 'USDC'), '5');
  assert.equal(formatAmount('1000000000000000000', 'MUSD'), '1');
});

test('formatAmount still honours explicit fraction-digit options', () => {
  assert.equal(
    formatAmount('5000000', 'USDC', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
    '5.00'
  );
  assert.equal(formatAmount('2500000', 'USDC', { maximumFractionDigits: 0 }), '3');
});
