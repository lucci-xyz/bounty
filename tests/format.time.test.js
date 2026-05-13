import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatTimeLeft, formatTimeRemaining, formatDeadlineDate } from '../lib/format/time.js';

const now = Math.floor(Date.now() / 1000);

test('formatTimeLeft returns "-" for missing deadline', () => {
  assert.equal(formatTimeLeft(undefined), '-');
  assert.equal(formatTimeLeft(null), '-');
});

test('formatTimeLeft returns "Expired" for past deadlines', () => {
  assert.equal(formatTimeLeft(now - 3600), 'Expired');
});

test('formatTimeLeft formats days and hours', () => {
  assert.equal(formatTimeLeft(now + 86400 * 3 + 600), '3d');
  // +10s buffer to dodge sub-second test-runner drift across the hour boundary.
  assert.equal(formatTimeLeft(now + 3600 * 5 + 10), '5h');
  assert.equal(formatTimeLeft(now + 600), '< 1h');
});

test('formatTimeRemaining humanises labels', () => {
  assert.equal(formatTimeRemaining(now + 86400 + 60), '1 day');
  assert.equal(formatTimeRemaining(now + 86400 * 3 + 60), '3 days');
  assert.equal(formatTimeRemaining(now + 3600 + 10), '1 hour');
  assert.equal(formatTimeRemaining(now + 3600 * 4 + 10), '4 hours');
  assert.equal(formatTimeRemaining(now + 60), 'Less than 1h');
  assert.equal(formatTimeRemaining(undefined), 'Unknown');
});

test('formatDeadlineDate returns "-" for missing input', () => {
  assert.equal(formatDeadlineDate(undefined), '-');
  assert.equal(formatDeadlineDate(null), '-');
});

test('formatDeadlineDate formats a valid timestamp', () => {
  const result = formatDeadlineDate(1700000000, { locale: 'en-US' });
  assert.match(result, /November/);
  assert.match(result, /2023/);
});
