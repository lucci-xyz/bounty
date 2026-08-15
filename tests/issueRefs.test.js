import { test } from 'node:test';
import assert from 'node:assert/strict';

import { extractClosedIssues, extractMentionedIssues } from '../integrations/github/issueRefs.js';

test('extractClosedIssues returns [] for empty/missing bodies', () => {
  assert.deepEqual(extractClosedIssues(''), []);
  assert.deepEqual(extractClosedIssues(null), []);
  assert.deepEqual(extractClosedIssues(undefined), []);
});

test('extractClosedIssues recognises every GitHub closing keyword', () => {
  assert.deepEqual(extractClosedIssues('Closes #1'), [1]);
  assert.deepEqual(extractClosedIssues('close #2'), [2]);
  assert.deepEqual(extractClosedIssues('closed #3'), [3]);
  assert.deepEqual(extractClosedIssues('Fix #4'), [4]);
  assert.deepEqual(extractClosedIssues('fixes #5'), [5]);
  assert.deepEqual(extractClosedIssues('fixed #6'), [6]);
  assert.deepEqual(extractClosedIssues('Resolve #7'), [7]);
  assert.deepEqual(extractClosedIssues('resolves #8'), [8]);
  assert.deepEqual(extractClosedIssues('resolved #9'), [9]);
});

test('extractClosedIssues is case-insensitive and finds multiple references', () => {
  assert.deepEqual(extractClosedIssues('CLOSES #10 and Fixes #11'), [10, 11]);
});

test('extractClosedIssues ignores bare mentions without a closing keyword', () => {
  assert.deepEqual(extractClosedIssues('See #42 for context'), []);
  assert.deepEqual(extractClosedIssues('Related to #7, but does not fix it'), []);
});

test('extractClosedIssues does not treat substrings like "prefix" as keywords', () => {
  // "affixes" ends in "fixes" but should not match because of the word boundary
  // created by requiring whitespace before the '#'.
  assert.deepEqual(extractClosedIssues('This affixes#12 a label'), []);
});

test('extractMentionedIssues collects all #refs and dedupes preserving order', () => {
  assert.deepEqual(extractMentionedIssues('Fixes #3', 'Also touches #1 and #3 again'), [3, 1]);
});

test('extractMentionedIssues reads from both title and body', () => {
  assert.deepEqual(extractMentionedIssues('#5 in title', 'and #6 in body'), [5, 6]);
});

test('extractMentionedIssues tolerates missing title or body', () => {
  assert.deepEqual(extractMentionedIssues(undefined, '#8'), [8]);
  assert.deepEqual(extractMentionedIssues('#9', undefined), [9]);
  assert.deepEqual(extractMentionedIssues('', ''), []);
  assert.deepEqual(extractMentionedIssues(undefined, undefined), []);
});

test('parsed issue numbers are integers, not strings', () => {
  const [closed] = extractClosedIssues('Closes #123');
  assert.equal(closed, 123);
  assert.equal(typeof closed, 'number');

  const [mentioned] = extractMentionedIssues('#456', '');
  assert.equal(typeof mentioned, 'number');
});

/**
 * Money-path regression guards.
 *
 * These parsers decide which bounty a PR claims. Two exploitable behaviours are
 * pinned here: a cross-repo reference must never resolve to the local issue of
 * the same number, and a bare mention must never read as a closing reference.
 */

test('extractClosedIssues ignores cross-repo closing references', () => {
  // `Closes vendor/lib#42` closes an issue in ANOTHER repo. Treating it as
  // local #42 would pay this repo's bounty for unrelated work.
  assert.deepEqual(extractClosedIssues('Closes vendor/lib#42'), []);
  assert.deepEqual(extractClosedIssues('Fixes owner-name/repo.js#7'), []);
});

test('extractClosedIssues accepts the colon form', () => {
  assert.deepEqual(extractClosedIssues('Closes: #42'), [42]);
});

test('extractClosedIssues still ignores bare mentions', () => {
  assert.deepEqual(extractClosedIssues('Blocked on #42, landing the bump first'), []);
  assert.deepEqual(extractClosedIssues('Related to #7 but does not fix it'), []);
});

test('extractMentionedIssues does not read cross-repo refs as local issues', () => {
  // The exploit: "Upstream tracking issue: vendor/lib#42" previously returned
  // [42] and claimed the local 5,000 USDC bounty on issue #42.
  assert.deepEqual(extractMentionedIssues('chore: pin dep', 'Upstream: vendor/lib#42'), []);
  assert.deepEqual(extractMentionedIssues('', 'see anthropics/claude-code#123'), []);
});

test('extractMentionedIssues still matches genuine local references', () => {
  assert.deepEqual(extractMentionedIssues('Fix for #42', ''), [42]);
  assert.deepEqual(extractMentionedIssues('', '(#42) and [#43]'), [42, 43]);
  assert.deepEqual(extractMentionedIssues('#1 at start', ''), [1]);
});

test('extractMentionedIssues does not match #N glued to a preceding token', () => {
  assert.deepEqual(extractMentionedIssues('', 'v1.2#42'), []);
  assert.deepEqual(extractMentionedIssues('', 'abc#42'), []);
});
