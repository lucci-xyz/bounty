import { fetchJsonOrNull } from './client';

export async function checkAdminAccess() {
  const data = await fetchJsonOrNull('/api/admin/check');
  return Boolean(data?.isAdmin);
}

