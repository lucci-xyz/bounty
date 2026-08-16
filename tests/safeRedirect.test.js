import { test } from 'node:test';
import assert from 'node:assert/strict';

import { resolveSameOriginRedirect, safeRedirectOrDefault } from '../lib/safeRedirect.js';

const BASE = 'https://bountypay.example.xyz';

test('accepts relative paths', () => {
  assert.equal(resolveSameOriginRedirect('/app/account', BASE), `${BASE}/app/account`);
  assert.equal(resolveSameOriginRedirect('/', BASE), `${BASE}/`);
});

test('accepts absolute URLs on the same origin', () => {
  // The link-wallet flow legitimately passes window.location.href.
  const url = `${BASE}/app/link-wallet?returnTo=%2Fapp`;
  assert.equal(resolveSameOriginRedirect(url, BASE), url);
});

test('rejects a different origin', () => {
  assert.equal(resolveSameOriginRedirect('https://evil.example/login', BASE), null);
  assert.equal(resolveSameOriginRedirect('https://bountypay.example.xyz.evil.test/x', BASE), null);
});

test('rejects protocol-relative URLs', () => {
  // `//evil.example/x` resolves off-origin while looking like a path.
  assert.equal(resolveSameOriginRedirect('//evil.example/x', BASE), null);
  assert.equal(resolveSameOriginRedirect('//evil.example', BASE), null);
});

test('rejects non-HTTP schemes', () => {
  assert.equal(resolveSameOriginRedirect('javascript:alert(1)', BASE), null);
  assert.equal(resolveSameOriginRedirect('data:text/html,<script>', BASE), null);
});

test('rejects empty and non-string input', () => {
  for (const bad of ['', null, undefined, 42, {}]) {
    assert.equal(resolveSameOriginRedirect(bad, BASE), null);
  }
});

test('a port difference is a different origin', () => {
  assert.equal(resolveSameOriginRedirect('http://localhost:4000/x', 'http://localhost:3000'), null);
  assert.equal(
    resolveSameOriginRedirect('http://localhost:3000/x', 'http://localhost:3000'),
    'http://localhost:3000/x'
  );
});

test('safeRedirectOrDefault falls back for unsafe destinations', () => {
  assert.equal(safeRedirectOrDefault('https://evil.example', BASE), `${BASE}/`);
  assert.equal(safeRedirectOrDefault('//evil.example', BASE, '/app'), `${BASE}/app`);
  assert.equal(safeRedirectOrDefault('/app/account', BASE), `${BASE}/app/account`);
});
