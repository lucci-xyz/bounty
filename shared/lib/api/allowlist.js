import { deleteJson, fetchJsonOrNull, postJson } from './client';

export async function getAllowlist(bountyId) {
  if (!bountyId) {
    return [];
  }
  const data = await fetchJsonOrNull(`/api/allowlist/${bountyId}`);
  return data ?? [];
}

export function addToAllowlist(bountyId, address) {
  return postJson(`/api/allowlist/${bountyId}`, { address });
}

export function removeFromAllowlist(bountyId, allowlistId) {
  return deleteJson(`/api/allowlist/${bountyId}`, { allowlistId });
}

