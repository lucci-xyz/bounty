import { getOctokit } from './client.js';
import { handleIssueOpened } from './handlers/issueHandlers.js';
import { handleBountyCreated } from './handlers/bountyHandlers.js';
import { handlePROpened, handlePRMerged } from './handlers/prHandlers.js';
import { notifyMaintainers } from './handlers/notificationHelpers.js';

/**
 * Main webhook router for GitHub events
 * Delegates to specialized handlers in handlers/ directory
 */
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
          await handlePROpened(payload);
        } else if (action === 'closed' && payload.pull_request?.merged) {
          await handlePRMerged(payload);
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
    
    // Try to notify maintainers if we have enough context
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

// Re-export handleBountyCreated for backward compatibility with API routes
export { handleBountyCreated };
