import test from 'node:test';
import assert from 'node:assert/strict';

import { clearWalletSession, getWalletLinkPayload } from '../server/auth/walletLink.js';

test('getWalletLinkPayload binds wallet linking to the authenticated GitHub session', () => {
  const payload = getWalletLinkPayload(
    {
      githubId: 101,
      githubUsername: 'real-user',
      walletAddress: '0x1111111111111111111111111111111111111111'
    },
    {
      githubId: 999,
      githubUsername: 'attacker',
      walletAddress: '0x1111111111111111111111111111111111111111'
    }
  );

  assert.deepEqual(payload, {
    githubId: 101,
    githubUsername: 'real-user',
    walletAddress: '0x1111111111111111111111111111111111111111'
  });
});

test('getWalletLinkPayload rejects missing GitHub session', () => {
  assert.throws(
    () => getWalletLinkPayload({}, { walletAddress: '0x1111111111111111111111111111111111111111' }),
    /GitHub authentication required/
  );
});

test('getWalletLinkPayload rejects wallets that were not authenticated in session', () => {
  assert.throws(
    () => getWalletLinkPayload(
      {
        githubId: 101,
        githubUsername: 'real-user',
        walletAddress: '0x2222222222222222222222222222222222222222'
      },
      { walletAddress: '0x1111111111111111111111111111111111111111' }
    ),
    /Wallet not authenticated/
  );
});

test('clearWalletSession removes persisted wallet auth from the session', () => {
  const session = {
    walletAddress: '0x1111111111111111111111111111111111111111',
    chainId: 8453,
    siweNonce: 'nonce',
    githubId: 101
  };

  clearWalletSession(session);

  assert.equal(session.walletAddress, undefined);
  assert.equal(session.chainId, undefined);
  assert.equal(session.siweNonce, undefined);
  assert.equal(session.githubId, 101);
});
