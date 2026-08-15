import { test } from 'node:test';
import assert from 'node:assert/strict';

import { mapContractError } from '../lib/contractErrors.js';

test('explains each BountyEscrow custom error in plain language', () => {
  const cases = {
    NotSponsor: /only the wallet that funded/i,
    DeadlineNotReached: /has not expired yet/i,
    DeadlinePassed: /passed its deadline/i,
    NotOpen: /no longer open/i,
    AlreadyExists: /already exists/i,
    TokenNotAllowed: /not accepted/i
  };

  for (const [name, pattern] of Object.entries(cases)) {
    const message = mapContractError({
      message: `execution reverted (unknown custom error) ${name}`
    });
    assert.match(message, pattern, `${name} should be explained`);
  }
});

test('never leaks a raw revert blob to the user', () => {
  const raw =
    'execution reverted (unknown custom error) (action="estimateGas", data="0x1f2a3b4c", reason=null)';
  const message = mapContractError({ message: raw });

  assert.equal(message.includes('0x1f2a3b4c'), false);
  assert.equal(message.includes('estimateGas'), false);
  assert.match(message, /contract rejected/i);
});

test('treats a wallet rejection as a calm message, not an error dump', () => {
  assert.match(mapContractError({ code: 'ACTION_REJECTED' }), /rejected in your wallet/i);
  assert.match(mapContractError({ code: 4001 }), /rejected in your wallet/i);
  assert.match(mapContractError({ message: 'user rejected the request' }), /rejected in your wallet/i);
});

test('explains missing gas funds', () => {
  assert.match(
    mapContractError({ message: 'insufficient funds for intrinsic transaction cost' }),
    /gas fees/i
  );
});

test('falls back cleanly for unknown and empty errors', () => {
  assert.match(mapContractError(null, 'Fallback text'), /Fallback text/);
  assert.match(mapContractError({}, 'Fallback text'), /Fallback text/);
  assert.match(mapContractError(undefined), /Something went wrong/i);
});

test('a short ethers reason is passed through', () => {
  assert.equal(mapContractError({ reason: 'Bounty is not fundable' }), 'Bounty is not fundable');
});
