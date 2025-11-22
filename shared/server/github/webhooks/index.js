import { getOctokit } from '../client.js';
import { notifyMaintainers } from '../services/maintainerAlerts.js';
import { handleIssueOpened } from './actions/issues.js';
import { handlePullRequestOpened, handlePullRequestMerged } from './actions/pullRequests.js';
import { handleBountyCreated } from './actions/bounties.js';

export async function handleWebhook(event, payload) {
  try {
    const action = payload.action;

    switch (event) {
      case 'issues':
        if (action === 'opened') {
          await handleIssueOpened(payload);
        }
        break;

      case 'pull_request':
        if (action === 'opened' || action === 'edited') {
          await handlePullRequestOpened(payload);
        } else if (action === 'closed' && payload.pull_request?.merged) {
          await handlePullRequestMerged(payload);
        }
        break;

      case 'ping':
        console.log('Webhook ping received');
        break;

      case 'installation':
      case 'installation_repositories':
        console.log('GitHub App installation event');
        break;

      default:
        break;
    }
  } catch (error) {
    console.error('Error handling webhook:', error.message);

    try {
      const { repository, installation, issue, pull_request } = payload;

      if (repository && installation) {
        const octokit = await getOctokit(installation.id);
        const [owner, repo] = repository.full_name.split('/');
        const targetNumber = issue?.number || pull_request?.number;

        if (targetNumber) {
          await notifyMaintainers(octokit, owner, repo, targetNumber, {
            errorType: `Webhook Processing Error (${event})`,
            errorMessage: error.stack || error.message,
            severity: 'critical',
            prNumber: pull_request?.number,
            username: pull_request?.user?.login || issue?.user?.login,
            context: `**Event:** ${event}\n**Action:** ${payload.action || 'N/A'}\n**Repository:** ${repository.full_name}\n\nWebhook was received but processing failed. Check server logs for full stack trace.`
          });
        }
      }
    } catch (notifyError) {
      console.error('Could not notify maintainers of webhook error:', notifyError.message);
    }

    throw error;
  }
}

export { handleBountyCreated };

