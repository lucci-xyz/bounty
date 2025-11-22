import { fetchJson, fetchJsonOrNull } from './client';

export function getGithubUser() {
  return fetchJsonOrNull('/api/oauth/user');
}

export function getUserProfile() {
  return fetchJsonOrNull('/api/user/profile');
}

export function getUserBounties() {
  return fetchJson('/api/user/bounties');
}

export function getUserStats() {
  return fetchJson('/api/user/stats');
}

export function getClaimedBounties() {
  return fetchJson('/api/user/claimed-bounties');
}

export function getUserWalletByGithubId(githubId) {
  if (!githubId) {
    return Promise.resolve(null);
  }
  return fetchJsonOrNull(`/api/wallet/${githubId}`);
}

