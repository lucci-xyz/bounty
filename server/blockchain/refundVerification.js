export function validateRefundConfirmationResult({
  receipt,
  expectedEscrowAddress,
  foundRefundEvent,
  onChainStatus
}) {
  if (!receipt) {
    return { verified: false, reason: 'Transaction receipt not found on the configured network' };
  }

  if (receipt.status !== 1 && receipt.status !== 1n) {
    return { verified: false, reason: 'Refund transaction did not succeed on-chain' };
  }

  const normalizedExpectedEscrow = expectedEscrowAddress?.toLowerCase();
  const normalizedReceiptTo = typeof receipt.to === 'string' ? receipt.to.toLowerCase() : '';
  if (!normalizedExpectedEscrow || normalizedReceiptTo !== normalizedExpectedEscrow) {
    return { verified: false, reason: 'Refund transaction was not sent to the configured escrow contract' };
  }

  if (!foundRefundEvent) {
    return { verified: false, reason: 'Refund transaction did not emit the expected Refunded event' };
  }

  if (onChainStatus !== 'refunded') {
    return { verified: false, reason: 'Bounty is not marked as refunded on-chain' };
  }

  return { verified: true };
}
