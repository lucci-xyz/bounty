import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  SETTLEMENT,
  RESOLVE_GRACE_SECONDS,
  settleClaim,
  settleContributorClaims,
  toPublicSettlement
} from '../server/payouts/settleClaim.js';

const WALLET = '0x1111111111111111111111111111111111111111';
const NOW_SECONDS = 1_800_000_000;
const DAY = 24 * 60 * 60;

/**
 * An in-memory stand-in for the database and chain, recording every write so
 * each test can assert exactly what moved.
 */
function fakeWorld({ bounties = [], wallets = {}, claims = [], allowlists = {}, chain, clock } = {}) {
  const state = {
    nowMs: NOW_SECONDS * 1000,
    bounties: new Map(bounties.map((b) => [b.bountyId, { ...b }])),
    wallets: { ...wallets },
    claims: new Map(claims.map((c) => [c.id, { ...c }])),
    chainCalls: [],
    claimWrites: [],
    bountyWrites: []
  };

  const deps = {
    environment: 'prod',
    now: () => state.nowMs,
    isAddress: (value) => /^0x[0-9a-fA-F]{40}$/.test(String(value)),
    findBounty: async (bountyId) => state.bounties.get(bountyId) ?? null,
    findWallet: async (githubId) => state.wallets[githubId] ?? null,
    findClaimsByContributor: async (githubId) =>
      [...state.claims.values()].filter((c) => c.prAuthorGithubId === githubId),
    checkAllowed: async (bountyId, address) => {
      const list = allowlists[bountyId];
      if (!list) return { allowed: true, restricted: false };
      return { allowed: list.includes(address), restricted: true };
    },
    resolveOnChain: async (bountyId, address, network) => {
      state.chainCalls.push({ bountyId, address, network });
      if (clock) state.nowMs += clock;
      if (chain) return chain(bountyId, address, network);
      return { success: true, txHash: `0xtx_${bountyId}` };
    },
    markClaim: async (claimId, status, details = {}) => {
      state.claimWrites.push({ claimId, status, ...details });
      const claim = state.claims.get(claimId);
      if (claim) Object.assign(claim, { status, ...details });
    },
    markBountyResolved: async (bountyId, txHash) => {
      state.bountyWrites.push({ bountyId, txHash });
      const bounty = state.bounties.get(bountyId);
      if (bounty) Object.assign(bounty, { status: 'resolved', txHash });
    }
  };

  return { state, deps };
}

const openBounty = (overrides = {}) => ({
  bountyId: '0xb1',
  status: 'open',
  network: 'BASE_MAINNET',
  environment: 'prod',
  deadline: NOW_SECONDS + 7 * DAY,
  amount: '50000000',
  tokenSymbol: 'USDC',
  ...overrides
});

const claimFor = (overrides = {}) => ({
  id: 7,
  bountyId: '0xb1',
  prAuthorGithubId: 42,
  prNumber: 12,
  repoFullName: 'acme/widgets',
  status: 'pending_wallet',
  mergeVerifiedAt: NOW_SECONDS * 1000 - 60_000,
  ...overrides
});

// ---------------------------------------------------------------------------
// The stranded-payout bug
// ---------------------------------------------------------------------------

test('a pending_wallet claim is paid once the contributor has linked a wallet', async () => {
  const { state, deps } = fakeWorld({
    bounties: [openBounty()],
    wallets: { 42: { walletAddress: WALLET } },
    claims: [claimFor()]
  });

  const result = await settleClaim(claimFor(), deps);

  assert.equal(result.outcome, SETTLEMENT.PAID);
  assert.equal(result.txHash, '0xtx_0xb1');
  assert.equal(result.recipient, WALLET);
  assert.deepEqual(state.chainCalls, [{ bountyId: '0xb1', address: WALLET, network: 'BASE_MAINNET' }]);
  assert.deepEqual(state.bountyWrites, [{ bountyId: '0xb1', txHash: '0xtx_0xb1' }]);
  assert.deepEqual(state.claimWrites, [
    { claimId: 7, status: 'paid', txHash: '0xtx_0xb1', resolvedAt: NOW_SECONDS * 1000 }
  ]);
});

test('settleContributorClaims pays every stranded claim when a wallet is linked', async () => {
  const { state, deps } = fakeWorld({
    bounties: [openBounty(), openBounty({ bountyId: '0xb2' }), openBounty({ bountyId: '0xb3' })],
    wallets: { 42: { walletAddress: WALLET } },
    claims: [
      claimFor({ id: 1, bountyId: '0xb1', status: 'pending_wallet' }),
      claimFor({ id: 2, bountyId: '0xb2', status: 'failed' }),
      // Not merged yet: linking a wallet must not pay this.
      claimFor({ id: 3, bountyId: '0xb3', status: 'pending' }),
      // Someone else's claim.
      claimFor({ id: 4, bountyId: '0xb3', status: 'pending_wallet', prAuthorGithubId: 99 })
    ]
  });

  const results = await settleContributorClaims(42, deps);

  assert.deepEqual(
    results.map((r) => [r.claimId, r.outcome]),
    [
      [1, SETTLEMENT.PAID],
      [2, SETTLEMENT.PAID]
    ]
  );
  assert.deepEqual(
    state.chainCalls.map((c) => c.bountyId),
    ['0xb1', '0xb2']
  );
  assert.equal(state.claims.get(3).status, 'pending');
  assert.equal(state.claims.get(4).status, 'pending_wallet');
  // Callers announce each payout on its PR, so the claim travels with the result.
  assert.equal(results[0].claim.prNumber, 12);
  assert.equal(results[0].claim.repoFullName, 'acme/widgets');
});

test('settleContributorClaims ignores a claim belonging to someone else, even if the lookup returns one', async () => {
  // Defence in depth: a query bug must not let one contributor's wallet link
  // trigger settlement of another contributor's claims.
  const { state, deps } = fakeWorld({
    bounties: [openBounty()],
    wallets: { 42: { walletAddress: WALLET }, 99: { walletAddress: WALLET } },
    claims: [claimFor({ id: 4, prAuthorGithubId: 99 })]
  });
  deps.findClaimsByContributor = async () => [...state.claims.values()];

  assert.deepEqual(await settleContributorClaims(42, deps), []);
  assert.deepEqual(state.chainCalls, []);
});

test('a claim the merge gate never verified is not paid, whatever its status', async () => {
  // Before the closing-reference gate existed, the merge handler wrote
  // pending_wallet and failed for any claim on a merged PR, including claims
  // recorded from a bare mention or a forged webhook. Those rows carry no
  // verification marker and must not become payable.
  for (const status of ['pending_wallet', 'failed', 'pending']) {
    const { state, deps } = fakeWorld({
      bounties: [openBounty()],
      wallets: { 42: { walletAddress: WALLET } }
    });

    const result = await settleClaim(claimFor({ status, mergeVerifiedAt: null }), deps, {
      payableStatuses: ['pending', 'pending_wallet', 'failed']
    });

    assert.deepEqual(result, { outcome: SETTLEMENT.SKIPPED, reason: 'merge_unverified' }, status);
    assert.deepEqual(state.chainCalls, [], status);
    assert.deepEqual(state.claimWrites, [], status);
  }
});

test('linking a wallet does not pay a legacy claim the merge gate never verified', async () => {
  const { state, deps } = fakeWorld({
    bounties: [openBounty()],
    wallets: { 42: { walletAddress: WALLET } },
    claims: [claimFor({ mergeVerifiedAt: undefined })]
  });

  const results = await settleContributorClaims(42, deps);

  assert.deepEqual(
    results.map((r) => [r.outcome, r.reason]),
    [[SETTLEMENT.SKIPPED, 'merge_unverified']]
  );
  assert.deepEqual(state.chainCalls, []);
});

test('settleContributorClaims stops starting transfers once its time budget is spent', async () => {
  // Each transfer waits for confirmation. The wallet-link request has a hard
  // time limit, and being killed between sending a transfer and recording it
  // leaves the database behind the chain. Later claims wait for the dashboard.
  const { state, deps } = fakeWorld({
    bounties: [openBounty(), openBounty({ bountyId: '0xb2' }), openBounty({ bountyId: '0xb3' })],
    wallets: { 42: { walletAddress: WALLET } },
    claims: [
      claimFor({ id: 1, bountyId: '0xb1' }),
      claimFor({ id: 2, bountyId: '0xb2' }),
      claimFor({ id: 3, bountyId: '0xb3' })
    ],
    clock: 15_000
  });

  const results = await settleContributorClaims(42, deps, { budgetMs: 20_000 });

  assert.deepEqual(
    results.map((r) => [r.claimId, r.outcome]),
    [
      [1, SETTLEMENT.PAID],
      [2, SETTLEMENT.PAID],
      [3, SETTLEMENT.DEFERRED]
    ]
  );
  assert.equal(state.chainCalls.length, 2);
  assert.equal(state.claims.get(3).status, 'pending_wallet');
});

test('settleContributorClaims keeps going after one claim fails', async () => {
  const { deps } = fakeWorld({
    bounties: [openBounty(), openBounty({ bountyId: '0xb2' })],
    wallets: { 42: { walletAddress: WALLET } },
    claims: [claimFor({ id: 1, bountyId: '0xb1' }), claimFor({ id: 2, bountyId: '0xb2' })],
    chain: (bountyId) =>
      bountyId === '0xb1' ? { success: false, error: 'rpc down' } : { success: true, txHash: '0xok' }
  });

  const results = await settleContributorClaims(42, deps);

  assert.deepEqual(
    results.map((r) => r.outcome),
    [SETTLEMENT.CHAIN_FAILED, SETTLEMENT.PAID]
  );
});

test('settleContributorClaims isolates a claim whose settlement throws', async () => {
  const { deps } = fakeWorld({
    bounties: [openBounty({ bountyId: '0xb2' })],
    wallets: { 42: { walletAddress: WALLET } },
    claims: [claimFor({ id: 1, bountyId: '0xb1' }), claimFor({ id: 2, bountyId: '0xb2' })]
  });
  const findBounty = deps.findBounty;
  deps.findBounty = async (id) => {
    if (id === '0xb1') throw new Error('db timeout');
    return findBounty(id);
  };

  const results = await settleContributorClaims(42, deps);

  assert.equal(results[0].outcome, SETTLEMENT.ERROR);
  assert.equal(results[0].error.message, 'db timeout');
  assert.equal(results[1].outcome, SETTLEMENT.PAID);
});

test('settleContributorClaims does nothing for a contributor with no stranded claims', async () => {
  const { state, deps } = fakeWorld({
    wallets: { 42: { walletAddress: WALLET } },
    claims: [claimFor({ status: 'paid' }), claimFor({ id: 8, status: 'pending' })]
  });

  assert.deepEqual(await settleContributorClaims(42, deps), []);
  assert.deepEqual(state.chainCalls, []);
});

// ---------------------------------------------------------------------------
// Which claims may be settled
// ---------------------------------------------------------------------------

test('by default an unmerged (pending) claim is refused without touching the chain', async () => {
  const { state, deps } = fakeWorld({
    bounties: [openBounty()],
    wallets: { 42: { walletAddress: WALLET } }
  });

  const result = await settleClaim(claimFor({ status: 'pending' }), deps);

  assert.equal(result.outcome, SETTLEMENT.SKIPPED);
  assert.equal(result.reason, 'claim_not_payable');
  assert.deepEqual(state.chainCalls, []);
  assert.deepEqual(state.claimWrites, []);
});

test('the merge path can opt in to settling a pending claim', async () => {
  const { deps } = fakeWorld({
    bounties: [openBounty()],
    wallets: { 42: { walletAddress: WALLET } }
  });

  const result = await settleClaim(claimFor({ status: 'pending' }), deps, {
    payableStatuses: ['pending', 'pending_wallet', 'failed']
  });

  assert.equal(result.outcome, SETTLEMENT.PAID);
});

test('a paid claim is never paid again, whatever the caller allows', async () => {
  for (const status of ['paid', 'resolved']) {
    const { state, deps } = fakeWorld({
      bounties: [openBounty()],
      wallets: { 42: { walletAddress: WALLET } }
    });

    const result = await settleClaim(claimFor({ status }), deps, {
      payableStatuses: ['pending', 'pending_wallet', 'failed', 'paid', 'resolved']
    });

    assert.equal(result.outcome, SETTLEMENT.SKIPPED, status);
    assert.equal(result.reason, 'claim_not_payable', status);
    assert.deepEqual(state.chainCalls, [], status);
  }
});

test('a missing claim is skipped', async () => {
  const { deps } = fakeWorld();
  assert.deepEqual(await settleClaim(null, deps), { outcome: SETTLEMENT.SKIPPED, reason: 'claim_missing' });
});

// ---------------------------------------------------------------------------
// Bounty gates
// ---------------------------------------------------------------------------

test('a claim whose bounty no longer exists is skipped', async () => {
  const { state, deps } = fakeWorld({ wallets: { 42: { walletAddress: WALLET } } });

  const result = await settleClaim(claimFor(), deps);

  assert.deepEqual(result, { outcome: SETTLEMENT.SKIPPED, reason: 'bounty_missing' });
  assert.deepEqual(state.chainCalls, []);
});

test('a bounty that is already resolved or refunded is not paid again', async () => {
  for (const status of ['resolved', 'refunded']) {
    const { state, deps } = fakeWorld({
      bounties: [openBounty({ status })],
      wallets: { 42: { walletAddress: WALLET } }
    });

    const result = await settleClaim(claimFor(), deps);

    assert.equal(result.outcome, SETTLEMENT.SKIPPED, status);
    assert.equal(result.reason, 'bounty_not_open', status);
    assert.deepEqual(state.chainCalls, [], status);
    // The claim is left as it was: it did nothing wrong.
    assert.deepEqual(state.claimWrites, [], status);
  }
});

test('a bounty from another environment is never settled here', async () => {
  // stage and prod share a database. A stage deployment paying a prod bounty
  // would move real funds from a test environment.
  const { state, deps } = fakeWorld({
    bounties: [openBounty({ environment: 'stage' })],
    wallets: { 42: { walletAddress: WALLET } }
  });

  const result = await settleClaim(claimFor(), deps);

  assert.equal(result.reason, 'wrong_environment');
  assert.deepEqual(state.chainCalls, []);
});

test('a bounty with no network fails the claim so it can be retried once fixed', async () => {
  // Left `pending`, the claim would be settleable only by a webhook redelivery.
  const { state, deps } = fakeWorld({
    bounties: [openBounty({ network: null })],
    wallets: { 42: { walletAddress: WALLET } }
  });

  const result = await settleClaim(claimFor({ status: 'pending' }), deps, {
    payableStatuses: ['pending', 'pending_wallet', 'failed']
  });

  assert.equal(result.outcome, SETTLEMENT.NO_NETWORK);
  assert.equal(result.bounty.bountyId, '0xb1');
  assert.deepEqual(state.claimWrites, [{ claimId: 7, status: 'failed' }]);
  assert.deepEqual(state.chainCalls, []);
});

// ---------------------------------------------------------------------------
// Settlement window (BountyEscrow.resolve: block.timestamp <= deadline + RESOLVE_GRACE)
// ---------------------------------------------------------------------------

test('the grace period mirrors the contract constant', () => {
  assert.equal(RESOLVE_GRACE_SECONDS, DAY);
});

test('a payout inside the grace period after the deadline still goes through', async () => {
  const { deps } = fakeWorld({
    bounties: [openBounty({ deadline: NOW_SECONDS - DAY + 60 })],
    wallets: { 42: { walletAddress: WALLET } }
  });

  assert.equal((await settleClaim(claimFor(), deps)).outcome, SETTLEMENT.PAID);
});

test('past the window the contract is still asked, and its refusal is reported as the window closing', async () => {
  // The database deadline is not authoritative: before the chain became the
  // source of truth at creation, it came from the request body. Only the
  // contract may refuse a payout on timing. The window explains the refusal.
  const deadline = NOW_SECONDS - 2 * DAY;
  const { state, deps } = fakeWorld({
    bounties: [openBounty({ deadline })],
    wallets: { 42: { walletAddress: WALLET } },
    chain: () => ({ success: false, error: 'execution reverted (unknown custom error)' })
  });

  const result = await settleClaim(claimFor(), deps);

  assert.equal(state.chainCalls.length, 1);
  assert.equal(result.outcome, SETTLEMENT.WINDOW_CLOSED);
  assert.equal(result.closedAt, deadline + DAY);
  assert.deepEqual(state.claimWrites, [{ claimId: 7, status: 'failed' }]);
});

test('a payout the contract accepts is paid even when the database thinks it is late', async () => {
  const { deps } = fakeWorld({
    bounties: [openBounty({ deadline: NOW_SECONDS - 5 * DAY })],
    wallets: { 42: { walletAddress: WALLET } }
  });

  assert.equal((await settleClaim(claimFor(), deps)).outcome, SETTLEMENT.PAID);
});

test('a refusal within clock skew of the window closing is reported as a chain failure', async () => {
  // Our clock may run ahead of the chain's. Near the boundary, do not claim the
  // window closed when the transfer may have failed for another reason.
  const { deps } = fakeWorld({
    bounties: [openBounty({ deadline: NOW_SECONDS - DAY - 60 })],
    wallets: { 42: { walletAddress: WALLET } },
    chain: () => ({ success: false, error: 'rpc down' })
  });

  assert.equal((await settleClaim(claimFor(), deps)).outcome, SETTLEMENT.CHAIN_FAILED);
});

test('a missing wallet is reported even when the database says the window closed', async () => {
  // Linking may still work if the database deadline is wrong; if it is right,
  // the contract will say so when the payout is attempted.
  const { state, deps } = fakeWorld({ bounties: [openBounty({ deadline: NOW_SECONDS - 3 * DAY })] });

  assert.equal((await settleClaim(claimFor({ status: 'failed' }), deps)).outcome, SETTLEMENT.NEEDS_WALLET);
  assert.deepEqual(state.claimWrites, [{ claimId: 7, status: 'pending_wallet' }]);
});

test('a bounty without a readable deadline is left to the contract to judge', async () => {
  const { deps } = fakeWorld({
    bounties: [openBounty({ deadline: null })],
    wallets: { 42: { walletAddress: WALLET } }
  });

  assert.equal((await settleClaim(claimFor(), deps)).outcome, SETTLEMENT.PAID);
});

// ---------------------------------------------------------------------------
// Recipient gates
// ---------------------------------------------------------------------------

test('no linked wallet parks the claim as pending_wallet', async () => {
  const { state, deps } = fakeWorld({ bounties: [openBounty()] });

  const result = await settleClaim(claimFor({ status: 'failed' }), deps);

  assert.equal(result.outcome, SETTLEMENT.NEEDS_WALLET);
  assert.equal(result.bounty.bountyId, '0xb1');
  assert.deepEqual(state.claimWrites, [{ claimId: 7, status: 'pending_wallet' }]);
  assert.deepEqual(state.chainCalls, []);
});

test('a malformed stored wallet fails the claim without touching the chain', async () => {
  const { state, deps } = fakeWorld({
    bounties: [openBounty()],
    wallets: { 42: { walletAddress: '0xnot-an-address' } }
  });

  const result = await settleClaim(claimFor(), deps);

  assert.equal(result.outcome, SETTLEMENT.INVALID_WALLET);
  assert.equal(result.recipient, '0xnot-an-address');
  assert.deepEqual(state.claimWrites, [{ claimId: 7, status: 'failed' }]);
  assert.deepEqual(state.chainCalls, []);
});

test('the sponsor allowlist is enforced before any transfer', async () => {
  const { state, deps } = fakeWorld({
    bounties: [openBounty()],
    wallets: { 42: { walletAddress: WALLET } },
    allowlists: { '0xb1': ['0x2222222222222222222222222222222222222222'] }
  });

  const result = await settleClaim(claimFor(), deps);

  assert.equal(result.outcome, SETTLEMENT.NOT_ALLOWLISTED);
  assert.deepEqual(state.claimWrites, [{ claimId: 7, status: 'failed' }]);
  assert.deepEqual(state.chainCalls, []);
});

test('an allowlisted recipient is paid', async () => {
  const { deps } = fakeWorld({
    bounties: [openBounty()],
    wallets: { 42: { walletAddress: WALLET } },
    allowlists: { '0xb1': [WALLET] }
  });

  assert.equal((await settleClaim(claimFor(), deps)).outcome, SETTLEMENT.PAID);
});

// ---------------------------------------------------------------------------
// Chain and bookkeeping failures
// ---------------------------------------------------------------------------

test('a failed transaction marks the claim failed and leaves the bounty open', async () => {
  const { state, deps } = fakeWorld({
    bounties: [openBounty()],
    wallets: { 42: { walletAddress: WALLET } },
    chain: () => ({ success: false, error: 'execution reverted: NotOpen()' })
  });

  const result = await settleClaim(claimFor(), deps);

  assert.equal(result.outcome, SETTLEMENT.CHAIN_FAILED);
  assert.equal(result.error, 'execution reverted: NotOpen()');
  assert.deepEqual(state.claimWrites, [{ claimId: 7, status: 'failed' }]);
  assert.deepEqual(state.bountyWrites, []);
  assert.equal(state.bounties.get('0xb1').status, 'open');
});

test('a thrown chain error is contained and reported as a failed transaction', async () => {
  const { deps } = fakeWorld({
    bounties: [openBounty()],
    wallets: { 42: { walletAddress: WALLET } },
    chain: () => {
      throw new Error('socket hang up');
    }
  });

  const result = await settleClaim(claimFor(), deps);

  assert.equal(result.outcome, SETTLEMENT.CHAIN_FAILED);
  assert.equal(result.error, 'socket hang up');
});

test('a reported success without a tx hash is not treated as a payout', async () => {
  const { state, deps } = fakeWorld({
    bounties: [openBounty()],
    wallets: { 42: { walletAddress: WALLET } },
    chain: () => ({ success: true })
  });

  const result = await settleClaim(claimFor(), deps);

  assert.equal(result.outcome, SETTLEMENT.CHAIN_FAILED);
  assert.deepEqual(state.bountyWrites, []);
});

test('a database failure after the transfer still reports the payout and its tx hash', async () => {
  // The money has moved. Throwing here would discard the only record of the
  // transaction and invite a retry that reverts and marks a paid claim failed.
  const { deps } = fakeWorld({
    bounties: [openBounty()],
    wallets: { 42: { walletAddress: WALLET } }
  });
  deps.markBountyResolved = async () => {
    throw new Error('connection reset');
  };
  const claimWrites = [];
  deps.markClaim = async (claimId, status, details) => claimWrites.push({ claimId, status, ...details });

  const result = await settleClaim(claimFor(), deps);

  assert.equal(result.outcome, SETTLEMENT.PAID);
  assert.equal(result.txHash, '0xtx_0xb1');
  assert.equal(result.recordError.message, 'connection reset');
  // The claim write is still attempted on its own.
  assert.equal(claimWrites[0].status, 'paid');
});

test('the bounty is still marked resolved when recording the claim fails', async () => {
  const { state, deps } = fakeWorld({
    bounties: [openBounty()],
    wallets: { 42: { walletAddress: WALLET } }
  });
  deps.markClaim = async () => {
    throw new Error('deadlock');
  };

  const result = await settleClaim(claimFor(), deps);

  assert.equal(result.outcome, SETTLEMENT.PAID);
  assert.equal(result.recordError.message, 'deadlock');
  assert.deepEqual(state.bountyWrites, [{ bountyId: '0xb1', txHash: '0xtx_0xb1' }]);
});

// ---------------------------------------------------------------------------
// What leaves the server
// ---------------------------------------------------------------------------

test('the public summary of a failed settlement never carries the raw chain error', async () => {
  // Provider errors embed the configured RPC URL, commonly with an API key.
  const secret = 'https://base-mainnet.example/v2/SECRET_API_KEY';
  const { deps } = fakeWorld({
    bounties: [openBounty({ repoFullName: 'acme/widgets', issueNumber: 3 })],
    wallets: { 42: { walletAddress: WALLET } },
    claims: [claimFor()],
    chain: () => ({ success: false, error: `could not coalesce error (url=${secret})` })
  });

  const [result] = await settleContributorClaims(42, deps);
  const summary = toPublicSettlement(result);

  assert.equal(JSON.stringify(summary).includes('SECRET_API_KEY'), false);
  assert.equal(JSON.stringify(summary).includes(WALLET), false);
  assert.deepEqual(summary, {
    claimId: 7,
    outcome: SETTLEMENT.CHAIN_FAILED,
    repoFullName: 'acme/widgets',
    issueNumber: 3,
    prNumber: 12,
    amount: '50000000',
    tokenSymbol: 'USDC'
  });
});

test('the public summary of a payout carries the tx hash', async () => {
  const { deps } = fakeWorld({
    bounties: [openBounty({ repoFullName: 'acme/widgets', issueNumber: 3 })],
    wallets: { 42: { walletAddress: WALLET } },
    claims: [claimFor()]
  });

  const [result] = await settleContributorClaims(42, deps);

  assert.deepEqual(toPublicSettlement(result), {
    claimId: 7,
    outcome: SETTLEMENT.PAID,
    repoFullName: 'acme/widgets',
    issueNumber: 3,
    prNumber: 12,
    amount: '50000000',
    tokenSymbol: 'USDC',
    txHash: '0xtx_0xb1'
  });
});

test('the public summary of a thrown settlement drops the exception', async () => {
  const summary = toPublicSettlement({
    claimId: 9,
    claim: claimFor({ id: 9 }),
    outcome: SETTLEMENT.ERROR,
    error: new Error('password authentication failed for user "postgres"')
  });

  assert.deepEqual(summary, {
    claimId: 9,
    outcome: SETTLEMENT.ERROR,
    repoFullName: 'acme/widgets',
    prNumber: 12
  });
});

test('the public summary explains a skip and a closed window', () => {
  assert.equal(
    toPublicSettlement({ claimId: 1, outcome: SETTLEMENT.SKIPPED, reason: 'bounty_not_open' }).reason,
    'bounty_not_open'
  );
  assert.equal(
    toPublicSettlement({ claimId: 1, outcome: SETTLEMENT.WINDOW_CLOSED, closedAt: 123, bounty: openBounty() }).closedAt,
    123
  );
});
