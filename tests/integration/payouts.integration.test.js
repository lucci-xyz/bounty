import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';

/**
 * Settlement against a real Postgres, with only the chain faked.
 *
 * The unit tests in tests/settleClaim.test.js fix the rules against an
 * in-memory world. These check what that world cannot: the Prisma queries
 * behind it, including the conditional update that stops a losing concurrent
 * settlement from overwriting a paid claim.
 *
 * Runs only when TEST_DATABASE_URL points at a disposable database; it deletes
 * every row in the tables it touches. See the `integration` job in CI.
 */

const url = process.env.TEST_DATABASE_URL;
const skip = !url && 'TEST_DATABASE_URL not set';

function assertDisposable(databaseUrl) {
  const { hostname, pathname } = new URL(databaseUrl);
  const local = ['localhost', '127.0.0.1', '::1'].includes(hostname);
  if (!local || !/test/i.test(pathname)) {
    throw new Error(`Refusing to run destructive tests against ${hostname}${pathname}: use a local *test* database.`);
  }
}

const NOW = Date.now();
const NOW_S = Math.floor(NOW / 1000);
const WALLET = '0xAbCdEf0123456789abcdef0123456789ABCDEF01';
const TX = `0x${'f'.repeat(64)}`;
const id = (digit) => `0x${String(digit).repeat(64)}`;

let prisma;
let payoutDeps;
let settleClaim;
let settleContributorClaims;
let prClaimQueries;
let walletQueries;

before(async () => {
  if (skip) return;
  assertDisposable(url);
  process.env.DATABASE_URL = url;
  process.env.DIRECT_DATABASE_URL = url;
  process.env.ENV_TARGET = 'stage';
  // The chain registry is built at import. Nothing here reaches a chain:
  // every test replaces resolveOnChain.
  process.env.BLOCKCHAIN_SUPPORTED_TESTNET_ALIASES ||= 'BASE_SEPOLIA';
  process.env.BLOCKCHAIN_DEFAULT_TESTNET_ALIAS ||= 'BASE_SEPOLIA';

  ({ PrismaClient: prisma } = await import('@prisma/client'));
  prisma = new prisma();
  ({ payoutDeps } = await import('@/server/payouts/index.js'));
  ({ settleClaim, settleContributorClaims } = await import('@/server/payouts/settleClaim.js'));
  ({ prClaimQueries, walletQueries } = await import('@/server/db/prisma.js'));
});

after(async () => {
  await prisma?.$disconnect();
});

async function reset() {
  await prisma.prClaim.deleteMany();
  await prisma.allowlist.deleteMany();
  await prisma.walletMapping.deleteMany();
  await prisma.bounty.deleteMany();
  await prisma.user.deleteMany();
}

function createBounty(bountyId, issueNumber, extra = {}) {
  return prisma.bounty.create({
    data: {
      bountyId,
      repoFullName: 'acme/widgets',
      repoId: 1001n,
      issueNumber,
      sponsorAddress: `0x${'9'.repeat(40)}`,
      sponsorGithubId: 7n,
      token: `0x${'8'.repeat(40)}`,
      amount: '50000000',
      deadline: BigInt(NOW_S + 7 * 86400),
      status: 'open',
      network: 'BASE_SEPOLIA',
      chainId: 84532,
      tokenSymbol: 'USDC',
      environment: 'stage',
      createdAt: BigInt(NOW),
      updatedAt: BigInt(NOW),
      ...extra
    }
  });
}

function createClaim(bountyId, prNumber, status, { author = 42n, verified = true } = {}) {
  return prisma.prClaim.create({
    data: {
      bountyId,
      prNumber,
      prAuthorGithubId: author,
      repoFullName: 'acme/widgets',
      status,
      createdAt: BigInt(NOW),
      mergeVerifiedAt: verified ? BigInt(NOW) : null
    }
  });
}

function fakeChain() {
  const calls = [];
  const deps = {
    ...payoutDeps(),
    resolveOnChain: async (bountyId, to, network) => {
      calls.push({ bountyId, to, network });
      return { success: true, txHash: TX };
    }
  };
  return { calls, deps };
}

const statusOf = async (claimId) => (await prisma.prClaim.findUnique({ where: { id: claimId } })).status;

test('a stranded claim is paid when its contributor links a wallet', { skip }, async () => {
  await reset();
  await createBounty(id(1), 1);
  await createBounty(id(2), 2);
  await createBounty(id(3), 3);
  await createBounty(id(4), 4, { environment: 'prod' });
  await createBounty(id(5), 5);
  const stranded = await createClaim(id(1), 11, 'pending_wallet');
  const unmerged = await createClaim(id(2), 12, 'pending');
  const foreign = await createClaim(id(3), 13, 'pending_wallet', { author: 99n });
  const otherEnv = await createClaim(id(4), 14, 'failed');
  const legacy = await createClaim(id(5), 15, 'pending_wallet', { verified: false });
  const { calls, deps } = fakeChain();

  const beforeLink = await settleContributorClaims(42, deps);
  const byId = (rows) => rows.map((r) => [r.claimId, r.outcome, r.reason]).sort((a, b) => a[0] - b[0]);
  assert.deepEqual(byId(beforeLink), [
    [stranded.id, 'needs_wallet', undefined],
    [otherEnv.id, 'skipped', 'wrong_environment'],
    [legacy.id, 'skipped', 'merge_unverified']
  ]);
  assert.equal(calls.length, 0);

  await walletQueries.create(42, 'contributor', WALLET);
  const results = await settleContributorClaims(42, deps);

  assert.equal(results.find((r) => r.claimId === stranded.id).outcome, 'paid');
  assert.deepEqual(calls, [{ bountyId: id(1), to: WALLET.toLowerCase(), network: 'BASE_SEPOLIA' }]);

  const paidRow = await prisma.prClaim.findUnique({ where: { id: stranded.id } });
  assert.equal(paidRow.status, 'paid');
  assert.equal(paidRow.txHash, TX);
  assert.ok(paidRow.resolvedAt > 0n);
  const bounty = await prisma.bounty.findUnique({ where: { bountyId: id(1) } });
  assert.equal(bounty.status, 'resolved');
  assert.equal(bounty.txHash, TX);

  assert.equal(await statusOf(unmerged.id), 'pending');
  assert.equal(await statusOf(foreign.id), 'pending_wallet');
  assert.equal(await statusOf(otherEnv.id), 'failed');
  assert.equal(await statusOf(legacy.id), 'pending_wallet');
});

test('a paid claim cannot be overwritten by a settlement that lost the race', { skip }, async () => {
  await reset();
  await createBounty(id(1), 1);
  const claim = await createClaim(id(1), 11, 'paid');

  const result = await prClaimQueries.updateStatus(claim.id, 'failed');

  assert.equal(result.status, 'paid');
  assert.equal(await statusOf(claim.id), 'paid');
  assert.equal(await prClaimQueries.updateStatus(999999, 'failed'), null);
});

test('unpaid claims still move between statuses', { skip }, async () => {
  await reset();
  await createBounty(id(1), 1);
  const claim = await createClaim(id(1), 11, 'pending');

  assert.equal((await prClaimQueries.updateStatus(claim.id, 'pending_wallet')).status, 'pending_wallet');
  assert.equal((await prClaimQueries.updateStatus(claim.id, 'failed')).status, 'failed');
  const paid = await prClaimQueries.updateStatus(claim.id, 'paid', TX, NOW);
  assert.equal(paid.status, 'paid');
  assert.equal(paid.txHash, TX);
  assert.equal(paid.resolvedAt, NOW);
});

test('markMergeVerified sets the marker once and keeps the first time', { skip }, async () => {
  await reset();
  await createBounty(id(1), 1);
  const claim = await createClaim(id(1), 11, 'pending', { verified: false });

  const first = await prClaimQueries.markMergeVerified(claim.id);
  assert.equal(typeof first.mergeVerifiedAt, 'number');
  assert.ok(first.mergeVerifiedAt > 0);

  await new Promise((resolve) => setTimeout(resolve, 5));
  const second = await prClaimQueries.markMergeVerified(claim.id);
  assert.equal(second.mergeVerifiedAt, first.mergeVerifiedAt);
  assert.equal(await prClaimQueries.markMergeVerified(999999), null);
});

test('the sponsor allowlist in the database blocks a payout before the chain', { skip }, async () => {
  await reset();
  await createBounty(id(1), 1);
  await walletQueries.create(42, 'contributor', WALLET);
  const sponsor = await prisma.user.create({
    data: { githubId: 7n, githubUsername: 'sponsor', createdAt: BigInt(NOW), updatedAt: BigInt(NOW) }
  });
  await prisma.allowlist.create({
    data: {
      userId: sponsor.id,
      bountyId: id(1),
      repoId: 1001n,
      allowedAddress: `0x${'5'.repeat(40)}`,
      createdAt: BigInt(NOW)
    }
  });
  const claim = await createClaim(id(1), 11, 'failed');
  const { calls, deps } = fakeChain();

  const result = await settleClaim(await prClaimQueries.findById(claim.id), deps);

  assert.equal(result.outcome, 'not_allowlisted');
  assert.equal(calls.length, 0);
  assert.equal(await statusOf(claim.id), 'failed');
});
