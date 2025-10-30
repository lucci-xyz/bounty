import { getGitHubApp, getOctokit, postIssueComment, updateComment, addLabels, extractClosedIssues } from './client.js';
import { bountyQueries, walletQueries, prClaimQueries } from '../db/index.js';
import { resolveBounty, formatUSDC } from '../blockchain/contract.js';
import { CONFIG } from '../config.js';

const BADGE_BASE = 'https://img.shields.io/badge';
const BADGE_LABEL_COLOR = '111827';
const BADGE_STYLE = 'for-the-badge';
const FRONTEND_BASE = CONFIG.frontendUrl.replace(/\/$/, '');
const CTA_BUTTON = `${FRONTEND_BASE}/buttons/create-bounty.svg`;
const OG_ICON = `${FRONTEND_BASE}/icons/og.png`;

const encodeBadgeSegment = (text) => encodeURIComponent(text).replace(/-/g, '--');

function badge(label, value, color = '0B9ED9', extraQuery = '') {
  const labelEncoded = encodeBadgeSegment(label);
  const valueEncoded = encodeBadgeSegment(value);
  const query = `style=${BADGE_STYLE}&labelColor=${BADGE_LABEL_COLOR}${extraQuery ? `&${extraQuery}` : ''}`;
  return `![${label} ${value}](${BADGE_BASE}/${labelEncoded}-${valueEncoded}-${color}?${query})`;
}

function badgeLink(label, value, color, href, extraQuery = '') {
  return `[${badge(label, value, color, extraQuery)}](${href})`;
}

/**
 * Handle 'issues.opened' webhook
 */
export async function handleIssueOpened(payload) {
  const { issue, repository, installation } = payload;
  
  console.log(`📝 Issue opened: ${repository.full_name}#${issue.number}`);
  
  const octokit = await getOctokit(installation.id);
  const [owner, repo] = repository.full_name.split('/');
  
  // Post "Attach Bounty" button comment
  const attachUrl = `${FRONTEND_BASE}/attach-bounty?repo=${encodeURIComponent(repository.full_name)}&issue=${issue.number}&repoId=${repository.id}&installationId=${installation.id}`;
  
  const comment = `[![Create a bounty button](${CTA_BUTTON})](${attachUrl})

By [BountyPay](${FRONTEND_BASE}) <img src="${OG_ICON}" alt="BountyPay Icon" width="16" height="16" />

Need a refresher? [Wallet guide](${FRONTEND_BASE}/link-wallet)`;

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
  const summary = `${badge('Bounty', 'Live', '6366F1')}  ${badge('Amount', `${amountFormatted} USDC`, '0B9ED9')}  ${badge('Deadline', deadlineDate, '2563EB')}

> Custodied on Base via BountyPay.

- Status: **Open**
- Tx: [BaseScan](https://sepolia.basescan.org/tx/${txHash})
- Claim it: ship a PR (\`Closes #${issueNumber}\`) + [link wallet](${FRONTEND_BASE}/link-wallet)

–– BountyPay`;

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
    const comment = `${badge('Wallet', 'Needed', 'F97316')}

This PR trips a bounty. ${badgeLink('Link', 'Wallet', '2563EB', `${FRONTEND_BASE}/link-wallet`)} so the payout can teleport to you on merge.`;

    await postIssueComment(octokit, owner, repo, pull_request.number, comment);
  } else {
    // User already has wallet linked
    const comment = `${badge('Bounty', 'Ready', '10B981')}

Wallet on file: \`${walletMapping.wallet_address.slice(0, 6)}...${walletMapping.wallet_address.slice(-4)}\`. Merge it and the USDC zaps over.`;

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
      const comment = `${badge('Wallet', 'Needed', 'F97316')}

@${pull_request.user.login}, merge is done—only thing missing is a wallet. ${badgeLink('Link', 'Wallet', '2563EB', `${FRONTEND_BASE}/link-wallet`)} to claim the stack.`;

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
      const successComment = `${badge('Payment', 'Sent', '10B981')}

- Recipient: @${pull_request.user.login}
- Amount: ${amountFormatted} USDC
- Tx: [BaseScan](https://sepolia.basescan.org/tx/${result.txHash})

Nice ship.`;

      await postIssueComment(octokit, owner, repo, pull_request.number, successComment);
      
      // Update original issue's bounty comment
      if (bounty.pinned_comment_id) {
        const updatedSummary = `${badge('Bounty', 'Closed', '10B981')}  ${badge('Amount', `${amountFormatted} USDC`, '0B9ED9')}  ${badge('Paid', `@${pull_request.user.login}`, '10B981')}

Settled on Base · [Tx](https://sepolia.basescan.org/tx/${result.txHash})

–– BountyPay`;

        await updateComment(octokit, owner, repo, bounty.pinned_comment_id, updatedSummary);
      }
    } else {
      // Payout failed
      const errorComment = `${badge('Bounty', 'Retry', 'F97316')}

On-chain push bounced: ${result.error}

Ping the maintainers to rerun the payout.`;

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
