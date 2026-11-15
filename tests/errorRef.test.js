import { test } from 'node:test';
import assert from 'node:assert/strict';

import { newErrorRef, publicErrorMessage } from '../lib/errorRef.js';

test('newErrorRef returns an err_ prefix plus exactly 8 lowercase hex chars', () => {
  for (let i = 0; i < 50; i += 1) {
    assert.match(newErrorRef(), /^err_[0-9a-f]{8}$/);
  }
});

test('newErrorRef does not repeat across a batch of calls', () => {
  const refs = new Set(Array.from({ length: 200 }, () => newErrorRef()));
  assert.equal(refs.size, 200);
});

test('publicErrorMessage carries only the reference, in the documented wording', () => {
  assert.equal(
    publicErrorMessage('err_9f3a1c2b'),
    'Internal error (ref: err_9f3a1c2b). The team has the details in the server logs.'
  );
});

test('publicErrorMessage publishes the exact ref it was given and nothing else variable', () => {
  const a = publicErrorMessage('err_00000001');
  const b = publicErrorMessage('err_00000002');
  assert.ok(a.includes('err_00000001'));
  assert.ok(!a.includes('err_00000002'));
  // Same length and shape: the ref is the only part that changes, so no
  // provider text, stack, or URL can be smuggled through this surface.
  assert.equal(a.length, b.length);
  assert.equal(a.replace('err_00000001', '<ref>'), b.replace('err_00000002', '<ref>'));
});
