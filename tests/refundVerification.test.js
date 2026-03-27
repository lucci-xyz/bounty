import test from 'node:test';
import assert from 'node:assert/strict';

import { validateRefundConfirmationResult } from '../server/blockchain/refundVerification.js';

const escrowAddress = '0x3333333333333333333333333333333333333333';

test('validateRefundConfirmationResult accepts verified refund evidence', () => {
  assert.deepEqual(
    validateRefundConfirmationResult({
      receipt: { status: 1, to: escrowAddress },
      expectedEscrowAddress: escrowAddress,
      foundRefundEvent: true,
      onChainStatus: 'refunded'
    }),
    { verified: true }
  );
});

test('validateRefundConfirmationResult rejects missing receipt', () => {
  assert.deepEqual(
    validateRefundConfirmationResult({
      receipt: null,
      expectedEscrowAddress: escrowAddress,
      foundRefundEvent: false,
      onChainStatus: 'open'
    }),
    { verified: false, reason: 'Transaction receipt not found on the configured network' }
  );
});

test('validateRefundConfirmationResult rejects mismatched escrow target', () => {
  assert.deepEqual(
    validateRefundConfirmationResult({
      receipt: { status: 1, to: '0x4444444444444444444444444444444444444444' },
      expectedEscrowAddress: escrowAddress,
      foundRefundEvent: true,
      onChainStatus: 'refunded'
    }),
    { verified: false, reason: 'Refund transaction was not sent to the configured escrow contract' }
  );
});

test('validateRefundConfirmationResult rejects missing refund event', () => {
  assert.deepEqual(
    validateRefundConfirmationResult({
      receipt: { status: 1, to: escrowAddress },
      expectedEscrowAddress: escrowAddress,
      foundRefundEvent: false,
      onChainStatus: 'refunded'
    }),
    { verified: false, reason: 'Refund transaction did not emit the expected Refunded event' }
  );
});

test('validateRefundConfirmationResult rejects when on-chain state is not refunded', () => {
  assert.deepEqual(
    validateRefundConfirmationResult({
      receipt: { status: 1, to: escrowAddress },
      expectedEscrowAddress: escrowAddress,
      foundRefundEvent: true,
      onChainStatus: 'open'
    }),
    { verified: false, reason: 'Bounty is not marked as refunded on-chain' }
  );
});
