import { fetchJson, postJson } from './client';

export function getNonce() {
  return fetchJson('/api/nonce');
}

export function verifyWalletSignature(payload) {
  return postJson('/api/verify-wallet', payload);
}

export function linkWallet(payload) {
  return postJson('/api/wallet/link', payload);
}

