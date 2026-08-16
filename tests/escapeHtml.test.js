import { test } from 'node:test';
import assert from 'node:assert/strict';

import { escapeHtml } from '../lib/escapeHtml.js';

test('escapes the HTML-significant characters', () => {
  assert.equal(escapeHtml('<script>'), '&lt;script&gt;');
  assert.equal(escapeHtml('a & b'), 'a &amp; b');
  assert.equal(escapeHtml('say "hi"'), 'say &quot;hi&quot;');
  assert.equal(escapeHtml("it's"), 'it&#39;s');
});

test('neutralises a PR title that tries to break out of its element', () => {
  // A PR title is attacker-chosen and lands in a DKIM-signed email.
  const title = '</td><a href="https://evil.example">Claim your payout</a>';
  const escaped = escapeHtml(title);
  assert.equal(escaped.includes('<a href'), false);
  assert.equal(escaped.includes('</td>'), false);
  assert.match(escaped, /&lt;\/td&gt;/);
});

test('leaves ordinary text unchanged', () => {
  assert.equal(escapeHtml('Fix the auth layer (#42)'), 'Fix the auth layer (#42)');
});

test('handles null, undefined and non-strings', () => {
  assert.equal(escapeHtml(null), '');
  assert.equal(escapeHtml(undefined), '');
  assert.equal(escapeHtml(42), '42');
});
