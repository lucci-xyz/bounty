import { fetchJson, postJson } from './client';

export function getBetaApplications() {
  return fetchJson('/api/beta/applications');
}

export function reviewBetaApplication(applicationId, action) {
  return postJson('/api/beta/review', { applicationId, action });
}

