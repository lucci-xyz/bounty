export function assertExpectedSiweNonce(sessionNonce, messageNonce) {
  if (!sessionNonce) {
    throw new Error('Missing nonce');
  }

  if (sessionNonce !== messageNonce) {
    throw new Error('Invalid nonce');
  }
}
