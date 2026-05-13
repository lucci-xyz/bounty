import { test } from 'node:test';
import assert from 'node:assert/strict';
import nextConfig from '../next.config.js';

test('headers() defines a single global rule for all paths', async () => {
  const rules = await nextConfig.headers();
  assert.equal(rules.length, 1);
  assert.equal(rules[0].source, '/:path*');
});

test('OWASP-recommended security headers are set globally', async () => {
  const [{ headers }] = await nextConfig.headers();
  const byKey = Object.fromEntries(headers.map(h => [h.key, h.value]));

  assert.equal(byKey['Strict-Transport-Security'], 'max-age=63072000; includeSubDomains; preload');
  assert.equal(byKey['X-Frame-Options'], 'SAMEORIGIN');
  assert.equal(byKey['X-Content-Type-Options'], 'nosniff');
  assert.equal(byKey['Referrer-Policy'], 'strict-origin-when-cross-origin');
  assert.equal(byKey['Permissions-Policy'], 'camera=(), microphone=(), geolocation=()');
});

test('deprecated X-XSS-Protection header is NOT set', async () => {
  // Modern browsers ignore it; older browsers it actively introduced XSS
  // vulnerabilities (CVE-2018-6149, etc). OWASP recommends removing it
  // and relying on CSP instead. https://owasp.org/www-project-secure-headers/
  const [{ headers }] = await nextConfig.headers();
  const keys = headers.map(h => h.key);
  assert.equal(keys.includes('X-XSS-Protection'), false);
});

test('next.config does not enable the deprecated experimental.esmExternals flag', () => {
  assert.equal(nextConfig.experimental?.esmExternals, undefined);
});
