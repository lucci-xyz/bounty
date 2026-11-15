import { test } from 'node:test';
import assert from 'node:assert/strict';

import { formatDate } from '../lib/format/date.js';

// Pin the zone through the options passthrough so these assertions hold on
// any machine, not only on a UTC host.
const UTC = { options: { timeZone: 'UTC' } };

test('formatDate returns an empty string for missing or unparseable values', () => {
  assert.equal(formatDate(undefined), '');
  assert.equal(formatDate(null), '');
  assert.equal(formatDate('not-a-date'), '');
  assert.equal(formatDate(Number.NaN), '');
});

test('formatDate formats a Date in the default en-US shape', () => {
  assert.equal(
    formatDate(new Date(Date.UTC(2026, 0, 15, 12, 30)), UTC),
    'Jan 15, 2026, 12:30 PM'
  );
});

test('formatDate accepts epoch milliseconds as a number or bigint', () => {
  const ms = Date.UTC(2023, 10, 14, 22, 13, 20);
  assert.equal(formatDate(ms, UTC), 'Nov 14, 2023, 10:13 PM');
  assert.equal(formatDate(BigInt(ms), UTC), 'Nov 14, 2023, 10:13 PM');
});

test('formatDate treats a numeric string as epoch milliseconds, not a date string', () => {
  const ms = Date.UTC(2023, 10, 14, 22, 13, 20);
  assert.equal(formatDate(String(ms), UTC), 'Nov 14, 2023, 10:13 PM');
});

test('formatDate parses a non-numeric date string', () => {
  assert.equal(formatDate('2026-01-15T12:30:00.000Z', UTC), 'Jan 15, 2026, 12:30 PM');
});

test('formatDate honours caller options over the defaults', () => {
  const out = formatDate(new Date(Date.UTC(2026, 0, 15, 12, 30)), {
    options: { timeZone: 'UTC', month: 'long', hour: undefined, minute: undefined }
  });
  assert.ok(out.includes('January'));
  assert.ok(out.includes('2026'));
  assert.ok(!out.includes('12:30'));
});

test('formatDate honours a caller locale', () => {
  const out = formatDate(new Date(Date.UTC(2026, 0, 15, 12, 30)), {
    locale: 'en-GB',
    options: { timeZone: 'UTC' }
  });
  assert.ok(out.includes('15'));
  assert.ok(out.includes('Jan'));
  assert.ok(out.includes('2026'));
});
