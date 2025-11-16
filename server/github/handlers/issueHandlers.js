import { getOctokit, postIssueComment } from '../client.js';
import { CTA_BUTTON, BRAND_SIGNATURE } from './notificationHelpers.js';
import { CONFIG } from '../../config.js';

const FRONTEND_BASE = CONFIG.frontendUrl.replace(/\/$/, '');

/**
 * Handles 'issues.opened' webhook event
 * Posts a "Create Bounty" button comment on newly opened issues
 */
export async function handleIssueOpened(payload) {
  const { issue, repository, installation } = payload;
  
  try {
    const octokit = await getOctokit(installation.id);
    const [owner, repo] = repository.full_name.split('/');
    
    const attachUrl = `${FRONTEND_BASE}/attach-bounty?repo=${encodeURIComponent(repository.full_name)}&issue=${issue.number}&repoId=${repository.id}&installationId=${installation.id}`;
    
    const comment = `<a href="${attachUrl}" target="_blank" rel="noopener noreferrer"><img src="${CTA_BUTTON}" alt="Create a bounty button" /></a>

${BRAND_SIGNATURE}`;

    await postIssueComment(octokit, owner, repo, issue.number, comment);
  } catch (error) {
    console.error('Failed to post bounty button:', error.message);
  }
}

