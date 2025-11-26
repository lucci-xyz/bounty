import { logger } from '@/shared/lib/logger';
import { getOctokit, postIssueComment } from '../../client.js';
import { renderCreateButtonComment } from '../../templates/bounties';
import { CTA_BUTTON, FRONTEND_BASE, BRAND_SIGNATURE } from '../../constants.js';

export async function handleIssueOpened(payload) {
  const { issue, repository, installation } = payload;

  try {
    const octokit = await getOctokit(installation.id);
    const [owner, repo] = repository.full_name.split('/');

    const attachUrl = `${FRONTEND_BASE}/attach-bounty?repo=${encodeURIComponent(repository.full_name)}&issue=${
      issue.number
    }&repoId=${repository.id}&installationId=${installation.id}`;

    const comment = renderCreateButtonComment({
      attachUrl,
      ctaButtonUrl: CTA_BUTTON,
      brandSignature: BRAND_SIGNATURE
    });

    await postIssueComment(octokit, owner, repo, issue.number, comment);
  } catch (error) {
    logger.error('Failed to post bounty button:', error.message);
  }
}
