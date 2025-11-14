import { getGitHubApp, getOctokit, postIssueComment, updateComment, addLabels, ensureLabel, extractClosedIssues } from './client.js';
import { bountyQueries, walletQueries, prClaimQueries } from '../db/prisma.js';
import { resolveBountyOnNetwork } from '../blockchain/contract.js';
import { ethers } from 'ethers';
import { CONFIG } from '../config.js';

const BADGE_BASE = 'https://img.shields.io/badge';
const BADGE_LABEL_COLOR = '111827';
const BADGE_STYLE = 'for-the-badge';
const FRONTEND_BASE = CONFIG.frontendUrl.replace(/\/$/, '');
const CTA_BUTTON = `${FRONTEND_BASE}/buttons/create-bounty.svg`;
const OG_ICON = `${FRONTEND_BASE}/icons/og.png`;
const BRAND_SIGNATURE = `> _By <a href="${FRONTEND_BASE}" target="_blank" rel="noopener noreferrer">BountyPay</a> <img src="${OG_ICON}" alt="BountyPay Icon" width="18" height="18" />_`;

const encodeBadgeSegment = (text) => encodeURIComponent(text).replace(/-/g, '--');

function badge(label, value, color = '0B9ED9', extraQuery = '') {
  const labelEncoded = encodeBadgeSegment(label);
  const valueEncoded = encodeBadgeSegment(value);
  const query = `style=${BADGE_STYLE}&labelColor=${BADGE_LABEL_COLOR}${extraQuery ? `&${extraQuery}` : ''}`;
  return `![${label} ${value}](${BADGE_BASE}/${labelEncoded}-${valueEncoded}-${color}?${query})`;
}

/**
 * Notify repository maintainers about system errors
 */
async function notifyMaintainers(octokit, owner, repo, issueNumber, errorDetails) {
  const {
    errorType,
    errorMessage,
    severity = 'high', // 'critical', 'high', 'medium', 'low'
    bountyId,
    network,
    recipientAddress,
    prNumber,
    username,
    txHash,
    context
  } = errorDetails;

  const timestamp = new Date().toISOString();
  const errorId = `ERR-${Date.now().toString(36).toUpperCase()}`;
  
  // Severity emoji and color
  const severityConfig = {
    critical: { emoji: '🔴', label: 'CRITICAL', color: 'DC2626' },
    high: { emoji: '🟠', label: 'HIGH', color: 'EA580C' },
    medium: { emoji: '🟡', label: 'MEDIUM', color: 'CA8A04' },
    low: { emoji: '🔵', label: 'LOW', color: '2563EB' }
  };
  
  const config = severityConfig[severity] || severityConfig.high;
  
  // Build details section
  let detailsSection = '';
  if (bountyId) detailsSection += `\n- **Bounty ID:** \`${bountyId}\``;
  if (network) detailsSection += `\n- **Network:** ${network}`;
  if (recipientAddress) detailsSection += `\n- **Recipient:** \`${recipientAddress.slice(0, 10)}...${recipientAddress.slice(-8)}\``;
  if (prNumber) detailsSection += `\n- **PR:** #${prNumber}`;
  if (username) detailsSection += `\n- **User:** @${username}`;
  if (txHash) detailsSection += `\n- **Transaction:** \`${txHash}\``;
  
  // Truncate error message for readability
  const truncatedError = errorMessage.length > 300 
    ? errorMessage.substring(0, 300) + '...' 
    : errorMessage;
  
  const comment = `## ${config.emoji} BountyPay System Alert

${badge('Severity', config.label, config.color)}  
${badge('Error ID', errorId, '6B7280')}

**Issue Type:** ${errorType}  
**Timestamp:** ${timestamp}

### Error Details
\`\`\`
${truncatedError}
\`\`\`

### System Information
${detailsSection}
${context ? `\n### Additional Context\n${context}` : ''}

### Recommended Actions
- Review server logs for error ID \`${errorId}\`
- Check the <a href="${FRONTEND_BASE}/docs/support/troubleshooting" target="_blank" rel="noopener noreferrer">troubleshooting guide</a>
- If this persists, please open a support ticket with the error ID

---
*This is an automated system notification. The BountyPay team has been alerted.*`;

  try {
    await postIssueComment(octokit, owner, repo, issueNumber, comment);
    console.log(`📧 Maintainers notified of ${severity} severity error ${errorId} on issue #${issueNumber}`);
    return errorId;
  } catch (notifyError) {
    console.error(`Failed to notify maintainers:`, notifyError);
    return null;
  }
}

function badgeLink(label, value, color, href, extraQuery = '') {
  return `[${badge(label, value, color, extraQuery)}](${href})`;
}

function networkMeta(networkKey) {
  // Map network key used in DB/API to human/explorer info
  if (networkKey === 'MEZO_TESTNET') {
    return {
      name: 'Mezo Testnet',
      explorerTx: (hash) => `https://explorer.test.mezo.org/tx/${hash}`,
    };
  }
  // Default to Base Sepolia
  return {
    name: 'Base Sepolia',
    explorerTx: (hash) => `https://sepolia.basescan.org/tx/${hash}`,
  };
}

function formatAmountByToken(amount, tokenSymbol) {
  const decimals = tokenSymbol === 'MUSD' ? 18 : 6; // default USDC 6
  try {
    return ethers.formatUnits(amount, decimals);
  } catch {
    return amount; // fallback raw
  }
}

/**
 * Handle 'issues.opened' webhook
 */
export async function handleIssueOpened(payload) {
  const { issue, repository, installation } = payload;
  
  console.log(`📝 Issue opened: ${repository.full_name}#${issue.number}`);
  
  try {
    const octokit = await getOctokit(installation.id);
    const [owner, repo] = repository.full_name.split('/');
    
    // Post "Attach Bounty" button comment
    const attachUrl = `${FRONTEND_BASE}/attach-bounty?repo=${encodeURIComponent(repository.full_name)}&issue=${issue.number}&repoId=${repository.id}&installationId=${installation.id}`;
    
    const comment = `<a href="${attachUrl}" target="_blank" rel="noopener noreferrer"><img src="${CTA_BUTTON}" alt="Create a bounty button" /></a>

${BRAND_SIGNATURE}`;

    await postIssueComment(octokit, owner, repo, issue.number, comment);
  } catch (error) {
    console.error('Failed to post bounty button:', error);
    // Non-critical error, don't notify team
  }
}

/**
 * Handle bounty creation (called from frontend after funding)
 */
export async function handleBountyCreated(bountyData) {
  const { repoFullName, issueNumber, bountyId, amount, deadline, sponsorAddress, txHash, installationId, network = 'BASE_SEPOLIA', tokenSymbol = 'USDC' } = bountyData;
  
  console.log(`💰 Bounty created: ${repoFullName}#${issueNumber}`);
  
  try {
    const octokit = await getOctokit(installationId);
    const [owner, repo] = repoFullName.split('/');
    
    // Format deadline
    const deadlineDate = new Date(deadline * 1000).toISOString().split('T')[0];
    const amountFormatted = formatAmountByToken(amount, tokenSymbol);
    const net = networkMeta(network);
    
    // Post pinned bounty summary
    const truncatedTx = txHash ? `${txHash.slice(0, 10)}...` : 'transaction';
    const summary = `## <img src="${OG_ICON}" alt="BountyPay Icon" width="20" height="20" /> Bounty: ${amountFormatted} ${tokenSymbol} on ${net.name}

**Deadline:** ${deadlineDate}  
**Status:** Open  
**Tx:** <a href="${net.explorerTx(txHash)}" target="_blank" rel="noopener noreferrer">\`${truncatedTx}\`</a>

### To Claim:
1. Open a PR that closes this issue (use \`Closes #${issueNumber}\` in PR description)
2. <a href="${FRONTEND_BASE}/link-wallet?returnTo=${encodeURIComponent(`https://github.com/${repoFullName}/issues/${issueNumber}`)}" target="_blank" rel="noopener noreferrer">Link your wallet</a> to be eligible for payout
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
      // Non-critical, don't notify
    }
    
    // Update DB with comment ID
    try {
      await bountyQueries.updatePinnedComment(bountyId, comment.id);
    } catch (dbError) {
      console.error('Failed to update pinned comment ID:', dbError);
      
      // Notify maintainers about DB sync issue
      await notifyMaintainers(octokit, owner, repo, issueNumber, {
        errorType: 'Database Sync Error',
        errorMessage: dbError.message,
        severity: 'medium',
        bountyId,
        network,
        txHash,
        context: `Bounty was created successfully on-chain and the comment was posted, but saving the comment ID (${comment.id}) to the database failed. This may affect future bounty updates.`
      });
    }
    
    return comment;
  } catch (error) {
    console.error('Error in handleBountyCreated:', error);
    
    // Try to notify maintainers
    try {
      const octokit = await getOctokit(installationId);
      const [owner, repo] = repoFullName.split('/');
      
      await notifyMaintainers(octokit, owner, repo, issueNumber, {
        errorType: 'Bounty Notification Error',
        errorMessage: error.stack || error.message,
        severity: 'high',
        bountyId,
        network,
        txHash,
        context: `**Sponsor:** ${sponsorAddress}\n**Amount:** ${formatAmountByToken(amount, tokenSymbol)} ${tokenSymbol}\n\nThe bounty was created on-chain (tx: ${txHash}), but posting the notification comment failed. Users may not know about the bounty.`
      });
    } catch (notifyError) {
      console.error('Could not notify maintainers:', notifyError);
    }
    
    throw error;
  }
}

/**
 * Handle 'pull_request.opened' webhook
 */
export async function handlePROpened(payload) {
  const { pull_request, repository, installation } = payload;
  
  console.log(`🔀 PR opened: ${repository.full_name}#${pull_request.number}`);
  
  try {
    // Extract closed issues from PR body
    const closedIssues = extractClosedIssues(pull_request.body);
    
    if (closedIssues.length === 0) {
      return; // No issues referenced
    }
    
    // Check if any of these issues have bounties
    const bounties = [];
    for (const issueNumber of closedIssues) {
      const issueBounties = await bountyQueries.findByIssue(repository.id, issueNumber);
      bounties.push(...issueBounties);
    }
    
    if (bounties.length === 0) {
      return; // No bounties on these issues
    }
    
    const octokit = await getOctokit(installation.id);
    const [owner, repo] = repository.full_name.split('/');
    
    // Check if user has linked wallet
    const walletMapping = await walletQueries.findByGithubId(pull_request.user.id);
    
    if (!walletMapping) {
      // Prompt user to link wallet
      const prUrl = `https://github.com/${repository.full_name}/pull/${pull_request.number}`;
      const comment = `## <img src="${OG_ICON}" alt="BountyPay Icon" width="20" height="20" /> Bounty: Wallet Needed

**Status:** Awaiting wallet link  
**Why:** Payout can't trigger until a wallet is on file.

1. <a href="${FRONTEND_BASE}/link-wallet?returnTo=${encodeURIComponent(prUrl)}" target="_blank" rel="noopener noreferrer">Link your wallet</a>
2. Merge lands the bounty automatically.

${BRAND_SIGNATURE}`;

      await postIssueComment(octokit, owner, repo, pull_request.number, comment);
    } else {
      // User already has wallet linked
      const comment = `## <img src="${OG_ICON}" alt="BountyPay Icon" width="20" height="20" /> Bounty: Wallet Linked

**Status:** Ready to pay  
Linked wallet: \`${walletMapping.walletAddress.slice(0, 6)}...${walletMapping.walletAddress.slice(-4)}\`

1. Keep the wallet connected.  
2. Merge this PR and the payout triggers automatically.

${BRAND_SIGNATURE}`;

      await postIssueComment(octokit, owner, repo, pull_request.number, comment);
    }
    
    // Record PR claims
    for (const bounty of bounties) {
      try {
        await prClaimQueries.create(
          bounty.bountyId,
          pull_request.number,
          pull_request.user.id,
          repository.full_name
        );
      } catch (claimError) {
        console.error(`Failed to record PR claim:`, claimError);
        
        // Notify about claim recording failure - this is critical
        await notifyMaintainers(octokit, owner, repo, pull_request.number, {
          errorType: 'PR Claim Recording Failed',
          errorMessage: claimError.message,
          severity: 'critical',
          bountyId: bounty.bountyId,
          network: bounty.network,
          prNumber: pull_request.number,
          username: pull_request.user.login,
          context: `Failed to record this PR as a claim for bounty ${bounty.bountyId}. This will prevent automatic payout when the PR is merged. Manual intervention required.`
        });
      }
    }
  } catch (error) {
    console.error('Error in handlePROpened:', error);
    
    // Try to notify maintainers
    try {
      const octokit = await getOctokit(installation.id);
      const [owner, repo] = repository.full_name.split('/');
      
      await notifyMaintainers(octokit, owner, repo, pull_request.number, {
        errorType: 'PR Open Handler Error',
        errorMessage: error.stack || error.message,
        severity: 'high',
        prNumber: pull_request.number,
        username: pull_request.user.login,
        context: `**Repository:** ${repository.full_name}\n**PR Title:** ${pull_request.title}\n\nFailed to process PR open event. Bounty notifications may not have been posted.`
      });
    } catch (notifyError) {
      console.error('Could not notify maintainers:', notifyError);
    }
    
    throw error;
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
  
  try {
    // Find PR claims
    const claims = await prClaimQueries.findByPR(repository.full_name, pull_request.number);
    
    if (claims.length === 0) {
      return; // No bounty claims for this PR
    }
    
    const octokit = await getOctokit(installation.id);
    const [owner, repo] = repository.full_name.split('/');
    
    // Process each claim
    for (const claim of claims) {
      const bounty = await bountyQueries.findById(claim.bountyId);
      
      if (!bounty) {
        console.log(`⚠️ Bounty ${claim.bountyId} not found in database`);
        continue;
      }
      
      if (bounty.status !== 'open') {
        console.log(`⚠️ Bounty ${bounty.bountyId} is not open (status: ${bounty.status})`);
        continue;
      }
      
      // Get solver's wallet
      const walletMapping = await walletQueries.findByGithubId(claim.prAuthorGithubId);
    
      if (!walletMapping) {
        // No wallet linked - post reminder
        console.log(`⚠️ User ${claim.prAuthorGithubId} has no linked wallet`);
        const prUrl = `https://github.com/${repository.full_name}/pull/${pull_request.number}`;
        const comment = `## <img src="${OG_ICON}" alt="BountyPay Icon" width="20" height="20" /> Bounty: Wallet Missing

**Status:** ⏸️ Payment paused  
@${pull_request.user.login}, your PR was merged but we can't send the payment without a wallet address.

**What to do:**
1. <a href="${FRONTEND_BASE}/link-wallet?returnTo=${encodeURIComponent(prUrl)}" target="_blank" rel="noopener noreferrer">Link your wallet here</a>
2. After linking, comment on this PR to trigger a manual payout

${BRAND_SIGNATURE}`;

        await postIssueComment(octokit, owner, repo, pull_request.number, comment);
        await prClaimQueries.updateStatus(claim.id, 'pending_wallet');
        continue;
      }
      
      // Validate wallet address format
      if (!ethers.isAddress(walletMapping.walletAddress)) {
        console.error(`❌ Invalid wallet address for user ${claim.prAuthorGithubId}: ${walletMapping.walletAddress}`);
        const prUrl = `https://github.com/${repository.full_name}/pull/${pull_request.number}`;
        const comment = `## <img src="${OG_ICON}" alt="BountyPay Icon" width="20" height="20" /> Bounty: Invalid Wallet

**Status:** ❌ Payment failed  
@${pull_request.user.login}, the wallet address on file (\`${walletMapping.walletAddress}\`) is invalid.

**What to do:**
1. <a href="${FRONTEND_BASE}/link-wallet?returnTo=${encodeURIComponent(prUrl)}" target="_blank" rel="noopener noreferrer">Re-link your wallet</a> with a valid Ethereum address
2. Contact support if this keeps happening

${BRAND_SIGNATURE}`;

        await postIssueComment(octokit, owner, repo, pull_request.number, comment);
        await prClaimQueries.updateStatus(claim.id, 'failed');
        
        // Notify maintainers about invalid wallet
        await notifyMaintainers(octokit, owner, repo, pull_request.number, {
          errorType: 'Invalid Wallet Address in Database',
          errorMessage: `User ${pull_request.user.login} (GitHub ID: ${claim.prAuthorGithubId}) has an invalid wallet address: ${walletMapping.walletAddress}`,
          severity: 'high',
          bountyId: bounty.bountyId,
          network: bounty.network,
          recipientAddress: walletMapping.walletAddress,
          prNumber: pull_request.number,
          username: pull_request.user.login,
          context: 'This indicates a data integrity issue in the wallet_mappings table. The user needs to re-link their wallet with a valid Ethereum address.'
        });
        
        continue;
      }
      
      console.log(`💰 Attempting to resolve bounty ${bounty.bountyId} to ${walletMapping.walletAddress}`);
      
      // Resolve bounty on-chain on the correct network
      let result;
      try {
        result = await resolveBountyOnNetwork(
          bounty.bountyId,
          walletMapping.walletAddress,
          bounty.network || 'BASE_SEPOLIA'
        );
      } catch (error) {
        console.error(`❌ Exception during bounty resolution:`, error);
        result = { success: false, error: error.message || 'Unknown error during resolution' };
      }
      
      if (result.success) {
        // Update DB
        await bountyQueries.updateStatus(bounty.bountyId, 'resolved', result.txHash);
        await prClaimQueries.updateStatus(claim.id, 'paid', result.txHash, Date.now());
        
        // Post success comment on PR
        const tokenSymbol = bounty.tokenSymbol || 'USDC';
        const amountFormatted = formatAmountByToken(bounty.amount, tokenSymbol);
        const net = networkMeta(bounty.network || 'BASE_SEPOLIA');
        const successComment = `## <img src="${OG_ICON}" alt="BountyPay Icon" width="20" height="20" /> Bounty: Paid

@${pull_request.user.login} just collected ${amountFormatted} ${tokenSymbol}.  
Transaction: <a href="${net.explorerTx(result.txHash)}" target="_blank" rel="noopener noreferrer">View Tx</a>

${BRAND_SIGNATURE}`;

        await postIssueComment(octokit, owner, repo, pull_request.number, successComment);
        
        // Update original issue's bounty comment
        if (bounty.pinnedCommentId) {
          const updatedSummary = `## <img src="${OG_ICON}" alt="BountyPay Icon" width="20" height="20" /> Bounty: Closed

**Paid:** ${amountFormatted} ${tokenSymbol} to @${pull_request.user.login}  
**Tx:** <a href="${net.explorerTx(result.txHash)}" target="_blank" rel="noopener noreferrer">View Tx</a>

${BRAND_SIGNATURE}`;

          await updateComment(octokit, owner, repo, bounty.pinnedCommentId, updatedSummary);
        }
      } else {
        // Payout failed - provide helpful error message
        console.error(`❌ Bounty resolution failed:`, result.error);
        
        let errorHelp = 'Tag a maintainer to investigate and replay the payout.';
        let notifySeverity = 'high';
        let shouldNotify = true;
        const errorLower = (result.error || '').toLowerCase();
        
        // Provide specific help based on error type
        if (errorLower.includes('batch') || errorLower.includes('drpc')) {
          errorHelp = 'This looks like an RPC provider issue. The team has been notified and will retry the payout.';
          notifySeverity = 'critical';
        } else if (errorLower.includes('insufficient') || errorLower.includes('balance')) {
          errorHelp = 'The contract may not have sufficient funds. The team needs to top up the escrow contract.';
          notifySeverity = 'critical';
        } else if (errorLower.includes('gas')) {
          errorHelp = 'Transaction failed due to gas estimation issues. The team will retry with adjusted gas settings.';
          notifySeverity = 'high';
        } else if (errorLower.includes('not open') || errorLower.includes('notopen')) {
          errorHelp = 'This bounty may have already been claimed. Please check the bounty status.';
          notifySeverity = 'low';
          shouldNotify = false; // Expected condition
        } else if (errorLower.includes('deadline')) {
          errorHelp = 'The bounty deadline may have passed. Team will review and potentially refund.';
          notifySeverity = 'medium';
        }
        
        const errorComment = `## <img src="${OG_ICON}" alt="BountyPay Icon" width="20" height="20" /> Bounty: Payment Failed

**Status:** ❌ Transaction error  
**Error:** \`${result.error.substring(0, 200)}${result.error.length > 200 ? '...' : ''}\`

**What happened:**  
${errorHelp}

**Network:** ${bounty.network || 'BASE_SEPOLIA'}  
**Recipient:** \`${walletMapping.walletAddress.slice(0, 10)}...${walletMapping.walletAddress.slice(-8)}\`

${BRAND_SIGNATURE}`;

        await postIssueComment(octokit, owner, repo, pull_request.number, errorComment);
        await prClaimQueries.updateStatus(claim.id, 'failed');
        
        // Notify maintainers for critical/high severity errors
        if (shouldNotify) {
          const tokenSymbol = bounty.tokenSymbol || 'USDC';
          const amountFormatted = formatAmountByToken(bounty.amount, tokenSymbol);
          
          await notifyMaintainers(octokit, owner, repo, pull_request.number, {
            errorType: 'Bounty Payout Failed',
            errorMessage: result.error,
            severity: notifySeverity,
            bountyId: bounty.bountyId,
            network: bounty.network || 'BASE_SEPOLIA',
            recipientAddress: walletMapping.walletAddress,
            prNumber: pull_request.number,
            username: pull_request.user.login,
            context: `**Bounty Amount:** ${amountFormatted} ${tokenSymbol}\n**PR Merged:** Yes\n**Claim ID:** ${claim.id}\n\nAutomated payout failed when PR was merged. Manual resolution required.`
          });
        }
      }
    }
  } catch (error) {
    console.error('Error in handlePRMerged:', error);
    
    // Try to notify maintainers
    try {
      const octokit = await getOctokit(installation.id);
      const [owner, repo] = repository.full_name.split('/');
      
      await notifyMaintainers(octokit, owner, repo, pull_request.number, {
        errorType: 'PR Merge Handler Error',
        errorMessage: error.stack || error.message,
        severity: 'critical',
        prNumber: pull_request.number,
        username: pull_request.user.login,
        context: `**Repository:** ${repository.full_name}\n**PR Title:** ${pull_request.title}\n**PR Merged:** Yes\n\nFailed to process merged PR event. Bounty payouts may not have been triggered.`
      });
    } catch (notifyError) {
      console.error('Could not notify maintainers:', notifyError);
    }
    
    throw error;
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
      console.error('Could not notify maintainers of webhook error:', notifyError);
    }
    
    throw error;
  }
}
