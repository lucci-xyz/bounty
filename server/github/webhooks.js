import { getGitHubApp, getOctokit, postIssueComment, updateComment, addLabels, ensureLabel, extractClosedIssues } from './client.js';
import { bountyQueries, walletQueries, prClaimQueries } from '../db/index.js';
import { resolveBounty, formatUSDC } from '../blockchain/contract.js';
import { CONFIG } from '../config.js';

const BADGE_BASE = 'https://img.shields.io/badge';
const BADGE_LABEL_COLOR = '111827';
const BADGE_STYLE = 'for-the-badge';
const FRONTEND_BASE = CONFIG.frontendUrl.replace(/\/$/, '');
const CTA_BUTTON = `${FRONTEND_BASE}/buttons/create-bounty.svg`;
const OG_ICON = `${FRONTEND_BASE}/icons/og.png`;
const BRAND_SIGNATURE = `> _By [BountyPay](${FRONTEND_BASE}) <img src="${OG_ICON}" alt="BountyPay Icon" width="18" height="18" />_`;

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

${BRAND_SIGNATURE}`;

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
  const truncatedTx = txHash ? `${txHash.slice(0, 10)}...` : 'transaction';
  const summary = `<img src="${OG_ICON}" alt="BountyPay Icon" width="20" height="20" /> ##  Bounty: ${amountFormatted} USDC on Base

**Deadline:** ${deadlineDate}  
**Status:** Open  
**Tx:** [\`${truncatedTx}\`](https://sepolia.basescan.org/tx/${txHash})

### To Claim:
1. Open a PR that closes this issue (use \`Closes #${issueNumber}\` in PR description)
2. [Link your wallet](${FRONTEND_BASE}/link-wallet) to be eligible for payout
3. When your PR is merged, you'll automatically receive the bounty!

${BRAND_SIGNATURE}`;

  const comment = await postIssueComment(octokit, owner, repo, issueNumber, summary);
  
  // Add label
  const labelName = `bounty:$${Math.floor(parseFloat(amountFormatted))}`;
  try {
    await ensureLabel(
      octokit,
      owner,
      repo,
      labelName,
      '83EEE8',
      'Active bounty amount'
    );
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
    const comment = `<img src="${OG_ICON}" alt="BountyPay Icon" width="20" height="20" /> ## Bounty: Wallet Needed

**Status:** Awaiting wallet link  
**Why:** Payout can’t trigger until a Base wallet is on file.

1. [Link your wallet](${FRONTEND_BASE}/link-wallet)  
2. Merge lands the bounty automatically.

${BRAND_SIGNATURE}`;

    await postIssueComment(octokit, owner, repo, pull_request.number, comment);
  } else {
    // User already has wallet linked
    const comment = `<img src="${OG_ICON}" alt="BountyPay Icon" width="20" height="20" /> ## Bounty: Wallet Linked

**Status:** Ready to pay  
Linked wallet: \`${walletMapping.wallet_address.slice(0, 6)}...${walletMapping.wallet_address.slice(-4)}\`

1. Keep the wallet connected.  
2. Merge this PR and the USDC hits instantly.

${BRAND_SIGNATURE}`;

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
      const comment = `<img src="${OG_ICON}" alt="BountyPay Icon" width="20" height="20" /> ## Bounty: Wallet Missing

**Status:** Waiting on wallet  
@${pull_request.user.login}, merge is done—only thing missing is a wallet.

1. [Link your wallet](${FRONTEND_BASE}/link-wallet)  
2. Ping us once it’s connected; we’ll replay the payout.

${BRAND_SIGNATURE}`;

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
      const successComment = `<img src="${OG_ICON}" alt="BountyPay Icon" width="20" height="20" /> ## Bounty: Paid

@${pull_request.user.login} just collected ${amountFormatted} USDC.  
Transaction: [BaseScan](https://sepolia.basescan.org/tx/${result.txHash})

${BRAND_SIGNATURE}`;

      await postIssueComment(octokit, owner, repo, pull_request.number, successComment);
      
      // Update original issue's bounty comment
      if (bounty.pinned_comment_id) {
        const updatedSummary = `<img src="${OG_ICON}" alt="BountyPay Icon" width="20" height="20" /> ## Bounty: Closed

**Paid:** ${amountFormatted} USDC to @${pull_request.user.login}  
**Tx:** [BaseScan](https://sepolia.basescan.org/tx/${result.txHash})

${BRAND_SIGNATURE}`;

        await updateComment(octokit, owner, repo, bounty.pinned_comment_id, updatedSummary);
      }
    } else {
      // Payout failed
      const errorComment = `<img src="${OG_ICON}" alt="BountyPay Icon" width="20" height="20" /> ## Bounty: Retry Needed

On-chain push bounced with: ${result.error}  
Tag a maintainer to replay the payout once the issue is resolved.

${BRAND_SIGNATURE}`;

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
