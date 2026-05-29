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
