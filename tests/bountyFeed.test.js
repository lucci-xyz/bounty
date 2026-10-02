import { test } from 'node:test';
import assert from 'node:assert/strict';

import { toPublicBounty, toPublicBounties } from '../lib/publicBounty.js';
import { filterActiveBounties } from '../lib/bountyFilter.js';

/**
 * Public feed shaping: redaction + active filtering.
 *
 * The server-rendered feed (`app/app/page.jsx`) and the client refresh path
 * (`useBountyFeed`) must produce byte-identical lists from the same rows, or
 * the page visibly churns on hydration and the crawler-visible content
 * differs from what users see. Both paths share these two functions, and
 * these tests pin their contract.
 *
 * Security note: `sponsorGithubId` must never reach unauthenticated callers.
 * The harm is the PAIRING of GitHub id to wallet address (see
 * lib/publicBounty.js), so the redaction tests below assert absence of the
 * field itself, not just a falsy value.
 */

const NOW = 1720000000;

function bounty(overrides = {}) {
  return {
    bountyId: '0xb1',
    repoFullName: 'octo/repo',
    issueNumber: 42,
    status: 'open',
    deadline: NOW + 3600,
    sponsorGithubId: 1337,
    sponsorAddress: '0x1111111111111111111111111111111111111111',
    ...overrides
  };
}

test('public shaping strips the sponsor GitHub id but keeps the address', () => {
  const redacted = toPublicBounty(bounty());

  assert.equal('sponsorGithubId' in redacted, false);
  assert.equal(redacted.sponsorAddress, '0x1111111111111111111111111111111111111111');
  assert.equal(redacted.bountyId, '0xb1');
});

test('public shaping does not mutate its input', () => {
  const input = bounty();
  toPublicBounty(input);

  assert.equal(input.sponsorGithubId, 1337);
});

test('public shaping passes through nullish and non-object input', () => {
  assert.equal(toPublicBounty(null), null);
  assert.equal(toPublicBounty(undefined), undefined);
  assert.equal(toPublicBounty('nope'), 'nope');
});

test('public list shaping maps rows and coerces non-arrays to []', () => {
  const redacted = toPublicBounties([bounty(), bounty({ bountyId: '0xb2' })]);

  assert.equal(redacted.length, 2);
  assert.ok(redacted.every((b) => !('sponsorGithubId' in b)));
  assert.deepEqual(toPublicBounties(null), []);
  assert.deepEqual(toPublicBounties(undefined), []);
  assert.deepEqual(toPublicBounties({}), []);
});

test('active filter keeps open bounties with a future deadline', () => {
  const list = filterActiveBounties([bounty(), bounty({ bountyId: '0xb2' })], NOW);

  assert.deepEqual(
    list.map((b) => b.bountyId),
    ['0xb1', '0xb2']
  );
});

test('active filter drops terminal statuses case-insensitively', () => {
  const list = filterActiveBounties(
    [
      bounty({ bountyId: '0xopen' }),
      bounty({ bountyId: '0xresolved', status: 'resolved' }),
      bounty({ bountyId: '0xResolved', status: 'Resolved' }),
      bounty({ bountyId: '0xrefunded', status: 'REFUNDED' })
    ],
    NOW
  );

  assert.deepEqual(
    list.map((b) => b.bountyId),
    ['0xopen']
  );
});

test('active filter drops expired bounties at the deadline boundary', () => {
  // Matches the contract-facing rule used by the client feed today: a bounty
  // counts as active only while now is strictly before its deadline.
  const list = filterActiveBounties(
    [
      bounty({ bountyId: '0xexact', deadline: NOW }),
      bounty({ bountyId: '0xpast', deadline: NOW - 1 }),
      bounty({ bountyId: '0xfuture', deadline: NOW + 1 })
    ],
    NOW
  );

  assert.deepEqual(
    list.map((b) => b.bountyId),
    ['0xfuture']
  );
});

test('active filter keeps bounties with a missing or non-numeric deadline', () => {
  const list = filterActiveBounties(
    [
      bounty({ bountyId: '0xmissing', deadline: undefined }),
      bounty({ bountyId: '0xnonstr', deadline: 'soon' })
    ],
    NOW
  );

  assert.equal(list.length, 2);
});

test('active filter skips nullish rows and coerces non-arrays to []', () => {
  const list = filterActiveBounties([null, undefined, bounty()], NOW);

  assert.deepEqual(
    list.map((b) => b.bountyId),
    ['0xb1']
  );
  assert.deepEqual(filterActiveBounties(null, NOW), []);
  assert.deepEqual(filterActiveBounties(undefined, NOW), []);
  assert.deepEqual(filterActiveBounties({}, NOW), []);
});
