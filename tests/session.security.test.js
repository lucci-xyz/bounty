import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildSessionOptions, buildCookieOptions, resolveCookieDomain } from '../lib/session/options.js';

test('session cookie has the OWASP-recommended flags', () => {
  const opts = buildSessionOptions({
    NODE_ENV: 'production',
    FRONTEND_URL: 'https://app.example.com',
    SESSION_SECRET: 'x'.repeat(32)
  });
  assert.equal(opts.cookieName, 'bountypay_session');
  assert.equal(opts.cookieOptions.httpOnly, true);
  assert.equal(opts.cookieOptions.sameSite, 'lax');
  assert.equal(opts.cookieOptions.path, '/');
  assert.equal(opts.cookieOptions.maxAge, 86400);
});

test('cookie is Secure in production', () => {
  const opts = buildCookieOptions({
    NODE_ENV: 'production',
    FRONTEND_URL: 'https://app.example.com'
  });
  assert.equal(opts.secure, true);
});

test('cookie is Secure whenever FRONTEND_URL is https, regardless of NODE_ENV', () => {
  const opts = buildCookieOptions({
    NODE_ENV: 'development',
    FRONTEND_URL: 'https://stage.example.com'
  });
  assert.equal(opts.secure, true);
});

test('cookie is NOT Secure on local http dev', () => {
  const opts = buildCookieOptions({
    NODE_ENV: 'development',
    FRONTEND_URL: 'http://localhost:3000'
  });
  assert.equal(opts.secure, false);
});

test('cookie domain is derived from FRONTEND_URL for non-local hosts', () => {
  assert.equal(
    resolveCookieDomain({ NODE_ENV: 'production', FRONTEND_URL: 'https://app.example.com' }),
    'app.example.com'
  );
});

test('cookie domain is omitted for localhost dev', () => {
  assert.equal(
    resolveCookieDomain({ NODE_ENV: 'development', FRONTEND_URL: 'http://localhost:3000' }),
    undefined
  );
});

test('COOKIE_DOMAIN env wins over FRONTEND_URL', () => {
  assert.equal(
    resolveCookieDomain({
      NODE_ENV: 'production',
      FRONTEND_URL: 'https://app.example.com',
      COOKIE_DOMAIN: '.example.com'
    }),
    '.example.com'
  );
});

test('malformed FRONTEND_URL is handled gracefully', () => {
  assert.equal(
    resolveCookieDomain({ NODE_ENV: 'development', FRONTEND_URL: 'not a url' }),
    undefined
  );
});
