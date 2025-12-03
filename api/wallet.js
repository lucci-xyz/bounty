"use client";

import { fetchJson, postJson } from '@/api/client';

/**
 * Fetches a new nonce string for signing in the wallet flow.
 * @returns {Promise<string>} The nonce from the API.
 */
export function getNonce() {
  return fetchJson('/api/nonce');
}

/**
 * Verifies a wallet signature with the backend.
 * @param {object} payload - SIWE signature payload.
 * @returns {Promise<object>} Verification result.
 */
export function verifyWalletSignature(payload) {
  return postJson('/api/verify-wallet', payload);
}

/**
 * Links a wallet address to the user's account.
 * @param {object} payload - Wallet and user details.
 * @returns {Promise<object>} Link result from the API.
 */
export function linkWallet(payload) {
  return postJson('/api/wallet/link', payload);
}

/**
 * Requests the server to build a SIWE message with canonical logic.
 * @param {object} payload - Fields required to build the message.
 * @returns {Promise<{message: string}>}
 */
export function buildSiweMessage(payload) {
  return postJson('/api/siwe/message', payload);
}

