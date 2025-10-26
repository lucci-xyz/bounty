import { getGitHubApp, getOctokit, postIssueComment, updateComment, addLabels, getPR, extractClosedIssues } from './client.js';
import { bountyQueries, walletQueries, prClaimQueries } from '../db/index.js';
import { resolveBounty, formatUSDC } from '../blockchain/contract.js';
import { CONFIG } from '../config.js';

/**
 * Handle 'issues.opened' webhook
 */
export async function handleIssueOpened(payload) {
  const { issue, repository, installation } = payload;
  
  console.log(`📝 Issue opened: ${repository.full_name}#${issue.number}`);
  
  const octokit = await getOctokit(installation.id);
  const [owner, repo] = repository.full_name.split('/');
  
  // Post "Attach Bounty" button comment
  const attachUrl = `${CONFIG.frontendUrl}/attach-bounty?repo=${encodeURIComponent(repository.full_name)}&issue=${issue.number}&repoId=${repository.id}&installationId=${installation.id}`;
  
  const comment = `## 💰 Attach a Bounty

Would you like to incentivize this issue with a bounty?

<a href="${attachUrl}" target="_blank"><strong>🚀 Attach Bounty</strong></a>

Connect your wallet and fund this issue with USDC on Base. Contributors who solve this issue will be automatically paid when their PR is merged.`;

  await postIssueComment(octokit, owner, repo, issue.number, comment);
}

/**
 * Handle bounty creation (called from frontend after funding)
 */
export async function handleBountyCreated(bountyData) {
  const { repoFullName, issueNumber, bountyId, amount, deadline, sponsorAddress, txHash, installationId } = bountyData;
  
  console.log(`💰 Bounty created: ${repoFullName}#${issueNumber}`);
  
  const octokit = await getOctokit(installationId);
  const [owner, repo] = repoFullName.split('/');
  
  // Format deadline
  const deadlineDate = new Date(deadline * 1000).toISOString().split('T')[0];
  const amountFormatted = formatUSDC(amount);
  
  // Post pinned bounty summary
  const summary = `## 💰 Bounty: ${amountFormatted} USDC on Base

⏳ **Deadline:** ${deadlineDate}  
📜 **Status:** Open  
🔗 **Chain:** Base Sepolia  
📝 **Tx:** [\`${txHash.slice(0, 10)}...\`](https://sepolia.basescan.org/tx/${txHash})

### To Claim:
1. Open a PR that closes this issue (use \`Closes #${issueNumber}\` in PR description)
2. [Link your wallet](${CONFIG.frontendUrl}/link-wallet) to be eligible for payout
3. When your PR is merged, you'll automatically receive the bounty!

---
*Powered by BountyPay on Base*`;

  const comment = await postIssueComment(octokit, owner, repo, issueNumber, summary);
  
  // Add label
  const labelName = `bounty:$${Math.floor(parseFloat(amountFormatted))}`;
  try {
    await addLabels(octokit, owner, repo, issueNumber, [labelName]);
  } catch (error) {
    console.error('Error adding label:', error.message);
  }
  
  // Update DB with comment ID
  bountyQueries.updatePinnedComment(bountyId, comment.id);
  
  return comment;
}

/**
 * Handle 'pull_request.opened' webhook
 */
export async function handlePROpened(payload) {
  const { pull_request, repository, installation } = payload;
  
  console.log(`🔀 PR opened: ${repository.full_name}#${pull_request.number}`);
  
  // Extract closed issues from PR body
  const closedIssues = extractClosedIssues(pull_request.body);
  
  if (closedIssues.length === 0) {
    return; // No issues referenced
  }
  
  // Check if any of these issues have bounties
  const bounties = [];
  for (const issueNumber of closedIssues) {
    const issueBounties = bountyQueries.findByIssue(repository.id, issueNumber);
    bounties.push(...issueBounties);
  }
  
  if (bounties.length === 0) {
    return; // No bounties on these issues
  }
  
  const octokit = await getOctokit(installation.id);
  const [owner, repo] = repository.full_name.split('/');
  
  // Check if user has linked wallet
  const walletMapping = walletQueries.findByGithubId(pull_request.user.id);
  
  if (!walletMapping) {
    // Prompt user to link wallet
    const comment = `## 🎉 This PR is eligible for a bounty!

This issue has an active bounty. To receive payment when your PR is merged, you need to link your wallet:

[**Link Your Wallet**](${CONFIG.frontendUrl}/link-wallet)

This is a one-time setup. Once linked, you'll automatically receive bounty payments for all future contributions!`;

    await postIssueComment(octokit, owner, repo, pull_request.number, comment);
  } else {
    // User already has wallet linked
    const comment = `## ✅ Bounty eligible

Your wallet (\`${walletMapping.wallet_address.slice(0, 6)}...${walletMapping.wallet_address.slice(-4)}\`) is linked. If this PR is merged, you'll automatically receive the bounty!`;

    await postIssueComment(octokit, owner, repo, pull_request.number, comment);
  }
  
  // Record PR claims
  for (const bounty of bounties) {
    prClaimQueries.create(
      bounty.bounty_id,
      pull_request.number,
      pull_request.user.id,
      repository.full_name
    );
  }
}

/**
 * Handle 'pull_request.closed' webhook (merged)
 */
export async function handlePRMerged(payload) {
  const { pull_request, repository, installation } = payload;
  
  if (!pull_request.merged) {
    return; // PR was closed but not merged
  }
  
  console.log(`✅ PR merged: ${repository.full_name}#${pull_request.number}`);
  
  // Find PR claims
  const claims = prClaimQueries.findByPR(repository.full_name, pull_request.number);
  
  if (claims.length === 0) {
    return; // No bounty claims for this PR
  }
  
  const octokit = await getOctokit(installation.id);
  const [owner, repo] = repository.full_name.split('/');
  
  // Process each claim
  for (const claim of claims) {
    const bounty = bountyQueries.findById(claim.bounty_id);
    
    if (!bounty || bounty.status !== 'open') {
      continue; // Bounty doesn't exist or not open
    }
    
    // Get solver's wallet
    const walletMapping = walletQueries.findByGithubId(claim.pr_author_github_id);
    
    if (!walletMapping) {
      // No wallet linked - post reminder
      const comment = `## ⏳ Bounty payout pending

@${pull_request.user.login} Your PR has been merged! To receive the bounty payment, please link your wallet:

[**Link Your Wallet**](${CONFIG.frontendUrl}/link-wallet)

The bounty will be sent as soon as your wallet is linked.`;

      await postIssueComment(octokit, owner, repo, pull_request.number, comment);
      continue;
    }
    
    // Resolve bounty on-chain
    const result = await resolveBounty(bounty.bounty_id, walletMapping.wallet_address);
    
    if (result.success) {
      // Update DB
      bountyQueries.updateStatus(bounty.bounty_id, 'resolved', result.txHash);
      prClaimQueries.updateStatus(claim.id, 'paid', result.txHash, Date.now());
      
      // Post success comment on PR
      const amountFormatted = formatUSDC(bounty.amount);
      const successComment = `## ✅ Bounty Paid!

Congratulations @${pull_request.user.login}! 

💰 **${amountFormatted} USDC** has been sent to your wallet.

**Recipient:** \`${walletMapping.wallet_address}\`  
**Transaction:** [\`${result.txHash}\`](https://sepolia.basescan.org/tx/${result.txHash})

Thank you for your contribution!`;

      await postIssueComment(octokit, owner, repo, pull_request.number, successComment);
      
      // Update original issue's bounty comment
      if (bounty.pinned_comment_id) {
        const updatedSummary = `## 💰 Bounty: ${amountFormatted} USDC on Base

📜 **Status:** ✅ Resolved  
👤 **Paid to:** @${pull_request.user.login}  
🔗 **Transaction:** [\`${result.txHash}\`](https://sepolia.basescan.org/tx/${result.txHash})

---
*Bounty successfully paid via BountyPay on Base*`;

        await updateComment(octokit, owner, repo, bounty.pinned_comment_id, updatedSummary);
      }
    } else {
      // Payout failed
      const errorComment = `## ❌ Bounty payout failed

There was an error processing the bounty payment. Error: ${result.error}

Please contact support or try again later.`;

      await postIssueComment(octokit, owner, repo, pull_request.number, errorComment);
      prClaimQueries.updateStatus(claim.id, 'failed');
    }
  }
}

/**
 * Main webhook router
 */
export async function handleWebhook(event, payload) {
  try {
    // GitHub sends event type + action in payload
    const action = payload.action;
    
    switch (event) {
      case 'issues':
        if (action === 'opened') {
          await handleIssueOpened(payload);
        } else {
          console.log(`Unhandled issues action: ${action}`);
        }
        break;
        
      case 'pull_request':
        if (action === 'opened') {
          await handlePROpened(payload);
        } else if (action === 'closed' && payload.pull_request?.merged) {
          await handlePRMerged(payload);
        } else {
          console.log(`Unhandled pull_request action: ${action}`);
        }
        break;
        
      case 'ping':
        console.log('✅ Webhook ping received - connection successful!');
        break;
        
      case 'installation':
      case 'installation_repositories':
        console.log(`✅ GitHub App ${action || 'event'} - installation successful!`);
        break;
        
      default:
        console.log(`Unhandled event: ${event}`);
    }
  } catch (error) {
    console.error(`Error handling webhook ${event}:`, error);
    throw error;
  }
}

