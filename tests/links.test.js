import { test } from 'node:test';
import assert from 'node:assert/strict';

import { LINKS, resolveLink, getLinkHref, getLinkMeta } from '../config/links.js';

test('static links resolve to their catalogued hrefs', () => {
  assert.equal(getLinkHref('github', 'orgRoot'), 'https://github.com/lucci-xyz');
  assert.equal(getLinkHref('github', 'appListing'), 'https://github.com/apps/bountypay');
  assert.equal(getLinkHref('app', 'marketingSite'), 'https://bountypay.luccilabs.xyz');
  assert.equal(getLinkHref('explorers', 'baseMainnet'), 'https://basescan.org');
});

test('external links carry the safe-window meta, internal links do not', () => {
  assert.deepEqual(getLinkMeta('github', 'orgRoot'), {
    target: '_blank',
    rel: 'noopener noreferrer'
  });
  assert.deepEqual(getLinkMeta('app', 'frontendLocal'), {});
  assert.equal(getLinkHref('app', 'frontendLocal'), 'http://localhost:3000');
});

test('dynamic GitHub links build from their named params', () => {
  assert.equal(
    getLinkHref('github', 'issue', { repoFullName: 'lucci-xyz/bounty', issueNumber: 42 }),
    'https://github.com/lucci-xyz/bounty/issues/42'
  );
  assert.equal(
    getLinkHref('github', 'pullRequest', { repoFullName: 'lucci-xyz/bounty', prNumber: 7 }),
    'https://github.com/lucci-xyz/bounty/pull/7'
  );
  assert.equal(
    getLinkHref('github', 'userProfile', { username: 'octocat' }),
    'https://github.com/octocat'
  );
});

test('dynamic explorer links build transaction URLs per network', () => {
  assert.equal(
    getLinkHref('explorers', 'baseMainnetTx', { txHash: '0xabc' }),
    'https://basescan.org/tx/0xabc'
  );
  assert.equal(
    getLinkHref('explorers', 'mezoTestnetTx', { txHash: '0xdef' }),
    'https://explorer.test.mezo.org/tx/0xdef'
  );
});

test('dynamic links throw naming every missing param, and accept 0 as a value', () => {
  assert.throws(() => getLinkHref('github', 'issue', {}), /Missing link parameters: repoFullName, issueNumber/);
  assert.throws(() => getLinkHref('github', 'issue', { repoFullName: 'a/b' }), /Missing link parameters: issueNumber/);
  assert.throws(() => getLinkHref('github', 'userProfile', { username: '' }), /Missing link parameters: username/);
  // 0 is a real value, not a missing one.
  assert.equal(
    getLinkHref('github', 'issue', { repoFullName: 'a/b', issueNumber: 0 }),
    'https://github.com/a/b/issues/0'
  );
});

test('unknown sections and keys throw instead of resolving to undefined', () => {
  assert.throws(() => resolveLink('nope', 'orgRoot'), /Unknown link reference: nope\.orgRoot/);
  assert.throws(() => getLinkHref('github', 'nope'), /Unknown link reference: github\.nope/);
});

test('resolveLink returns href and meta together for static and dynamic specs', () => {
  assert.deepEqual(resolveLink('social', 'xProfile'), {
    href: 'https://x.com/LucciLabs',
    meta: { target: '_blank', rel: 'noopener noreferrer' }
  });
  const dynamic = resolveLink('github', 'oauthAuthorize', { queryString: 'client_id=x&scope=repo' });
  assert.equal(dynamic.href, 'https://github.com/login/oauth/authorize?client_id=x&scope=repo');
});

test('the vercel deployment link trims the hostname and any trailing slash', () => {
  assert.equal(
    getLinkHref('app', 'vercelDeployment', { hostname: ' bounty.example.com ' }),
    'https://bounty.example.com'
  );
  assert.throws(() => getLinkHref('app', 'vercelDeployment', {}), /Missing link parameters: hostname/);
});

test('the catalogue is frozen so callers cannot rewrite shared URLs', () => {
  assert.ok(Object.isFrozen(LINKS));
  assert.ok(Object.isFrozen(LINKS.github));
  assert.ok(Object.isFrozen(LINKS.github.orgRoot));
  assert.ok(Object.isFrozen(LINKS.github.orgRoot.meta));
});
