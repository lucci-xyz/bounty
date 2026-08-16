import { test } from 'node:test';
import assert from 'node:assert/strict';

import { resolveDeadline, MIN_DEADLINE_SECONDS } from '../lib/deadline.js';

// 2026-08-15T12:00:00Z
const NOW = Math.floor(Date.parse('2026-08-15T12:00:00Z') / 1000);

test('a date-only pick means the END of that day, not its first instant', () => {
  // Parsing "2026-08-21" as UTC midnight gave a sponsor in UTC-4 an escrow
  // expiring Aug 20 at 8pm local — before the day they picked had begun.
  const result = resolveDeadline('2026-08-21', NOW);
  assert.equal(result, Math.floor(Date.parse('2026-08-21T23:59:59Z') / 1000));
});

test('a same-day pick still covers the rest of that day', () => {
  const result = resolveDeadline('2026-08-15', NOW);
  assert.equal(result, Math.floor(Date.parse('2026-08-15T23:59:59Z') / 1000));
  assert.ok(result > NOW + MIN_DEADLINE_SECONDS);
});

test('a past date is REJECTED, never silently rewritten', () => {
  // The old behaviour substituted now + 1 hour, so tapping "Today" late in the
  // day funded a one-hour bounty while every surface showed today's date.
  assert.throws(() => resolveDeadline('2026-08-14', NOW), /at least an hour from now/);
  assert.throws(() => resolveDeadline('2020-01-01', NOW), /at least an hour from now/);
});

test('a deadline inside the minimum window is rejected', () => {
  const soon = new Date((NOW + 60) * 1000);
  assert.throws(() => resolveDeadline(soon, NOW), /at least an hour from now/);
});

test('a deadline exactly at the minimum is accepted', () => {
  const exact = new Date((NOW + MIN_DEADLINE_SECONDS) * 1000);
  assert.equal(resolveDeadline(exact, NOW), NOW + MIN_DEADLINE_SECONDS);
});

test('unparseable and empty input is rejected with guidance', () => {
  assert.throws(() => resolveDeadline('not a date', NOW), /not a valid date/);
  assert.throws(() => resolveDeadline('', NOW), /select a deadline/);
  assert.throws(() => resolveDeadline(null, NOW), /select a deadline/);
  assert.throws(() => resolveDeadline(undefined, NOW), /select a deadline/);
});

test('full timestamps are honoured as given', () => {
  const iso = '2026-09-01T08:30:00Z';
  assert.equal(resolveDeadline(iso, NOW), Math.floor(Date.parse(iso) / 1000));
});
