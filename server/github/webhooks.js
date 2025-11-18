import { getGitHubApp, getOctokit, postIssueComment, updateComment, addLabels, ensureLabel, extractClosedIssues, extractMentionedIssues } from './client.js';
import { bountyQueries, walletQueries, prClaimQueries } from '../db/prisma.js';
import { resolveBountyOnNetwork } from '../blockchain/contract.js';
import { ethers } from 'ethers';
import { CONFIG } from '../config.js';
import { REGISTRY } from '../../config/chain-registry.js';
import { sendSystemEmail } from '../notifications/email.js';

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

  const emailSubject = `[BountyPay Alert] ${config.label} - ${errorType}`;
  const detailsHtml = detailsSection
    ? `<p><strong>Details:</strong><br/>${detailsSection.replace(/\n/g, '<br/>')}</p>`
    : '';
  const contextHtml = context ? `<p><strong>Additional Context:</strong><br/>${context.replace(/\n/g, '<br/>')}</p>` : '';
  const emailHtml = `
    <p>${config.emoji} <strong>${errorType}</strong></p>
    <p><strong>Repository:</strong> ${owner}/${repo}</p>
    <p><strong>Issue/PR:</strong> #${issueNumber}</p>
    <p><strong>Severity:</strong> ${config.label}</p>
    <p><strong>Error ID:</strong> ${errorId}</p>
    <p><strong>Timestamp:</strong> ${timestamp}</p>
    <p><strong>Error Details:</strong></p>
    <pre>${truncatedError}</pre>
    ${detailsHtml}
    ${contextHtml}
  `;

  try {
    await sendSystemEmail({
      subject: emailSubject,
      html: emailHtml
    });
  } catch (emailError) {
    console.error('Failed to send alert email:', emailError);
  }

  try {
    await postIssueComment(octokit, owner, repo, issueNumber, comment);
    console.log(`Maintainer notification posted: ${errorId}`);
    return errorId;
  } catch (notifyError) {
    console.error('Failed to notify maintainers:', notifyError.message);
    return null;
  }
}

function badgeLink(label, value, color, href, extraQuery = '') {
  return `[${badge(label, value, color, extraQuery)}](${href})`;
}

function networkMeta(networkKey) {
  if (!networkKey) {
    throw new Error('Missing network alias for bounty notification.');
  }

  const config = REGISTRY[networkKey];
  if (!config) {
    throw new Error(`Network alias "${networkKey}" is not configured in the registry.`);
  }

  const explorerBase = config.blockExplorerUrl?.replace(/\/$/, '');
  if (!explorerBase) {
    throw new Error(`Block explorer URL is missing for network "${networkKey}".`);
  }

  const resolvedName = config.name || networkKey;

  return {
    name: resolvedName,
    explorerTx: (hash) => `${explorerBase}/tx/${hash}`
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

/**
 * Handle bounty creation (called from frontend after funding)
 */
export async function handleBountyCreated(bountyData) {
  const { repoFullName, issueNumber, bountyId, amount, deadline, sponsorAddress, txHash, installationId, network, tokenSymbol } = bountyData;
  
  if (!network) {
    throw new Error('Network alias is required for bounty creation');
  }
  if (!tokenSymbol) {
    throw new Error('Token symbol is required for bounty creation');
  }
  
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
1. Open a PR that fixes this issue (mention #${issueNumber} anywhere in title or description)
2. <a href="${FRONTEND_BASE}/link-wallet?returnTo=${encodeURIComponent(`https://github.com/${repoFullName}/issues/${issueNumber}`)}" target="_blank" rel="noopener noreferrer">Link your wallet</a> to receive payment
3. Merge your PR and receive ${amountFormatted} ${tokenSymbol} automatically

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
      // Non-critical, don't log
    }
    
    // Update DB with comment ID
    try {
      await bountyQueries.updatePinnedComment(bountyId, comment.id);
    } catch (dbError) {
      console.error('Failed to update pinned comment ID:', dbError.message);
      
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
    console.error('Error in handleBountyCreated:', error.message);
    
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
      console.error('Could not notify maintainers:', notifyError.message);
    }
    
    throw error;
  }
}

/**
 * Handle 'pull_request.opened' webhook
 */
export async function handlePROpened(payload) {
  const { pull_request, repository, installation } = payload;
  
  try {
    const octokit = await getOctokit(installation.id);
    const [owner, repo] = repository.full_name.split('/');
    
    const environment = process.env.ENV_TARGET || 'stage';
    const allOpenBounties = await bountyQueries.getAllOpen(repository.id, environment);
    
    if (allOpenBounties.length === 0) {
      return;
    }
    
    const closedIssues = extractClosedIssues(pull_request.body);
    const mentionedIssues = extractMentionedIssues(pull_request.title, pull_request.body);
    
    // Auto-link if only one bounty exists
    if (allOpenBounties.length === 1 && closedIssues.length === 0 && mentionedIssues.length === 0) {
      await handlePRWithBounties(octokit, owner, repo, pull_request, repository, allOpenBounties);
      return;
    }
    
    // Match mentioned issues to bounties
    const matchedBounties = [];
    const issueNumbersToCheck = [...new Set([...closedIssues, ...mentionedIssues])];
    
    for (const issueNumber of issueNumbersToCheck) {
      const issueBounties = await bountyQueries.findByIssue(repository.id, issueNumber);
      matchedBounties.push(...issueBounties);
    }
    
    if (matchedBounties.length > 0) {
      await handlePRWithBounties(octokit, owner, repo, pull_request, repository, matchedBounties);
      return;
    }
    
    await suggestBounties(octokit, owner, repo, pull_request, allOpenBounties);
  } catch (error) {
    console.error('Error in handlePROpened:', error.message);
    
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
 * Suggest available bounties when PR doesn't reference any
 */
async function suggestBounties(octokit, owner, repo, pull_request, bounties) {
  if (bounties.length === 0) return;
  
  // Build list of available bounties
  let bountyList = '';
  for (const bounty of bounties.slice(0, 5)) { // Show max 5
    const tokenSymbol = bounty.tokenSymbol || 'USDC';
    const amountFormatted = formatAmountByToken(bounty.amount, tokenSymbol);
    bountyList += `- [#${bounty.issueNumber}](https://github.com/${bounty.repoFullName}/issues/${bounty.issueNumber}) - ${amountFormatted} ${tokenSymbol}\n`;
  }
  
  const highestBounty = bounties[0]; // Already sorted by amount
  
  const comment = `## <img src="${OG_ICON}" alt="BountyPay Icon" width="20" height="20" /> Bounty: Available Issues

@${pull_request.user.login}, there ${bounties.length === 1 ? 'is 1 open bounty' : `are ${bounties.length} open bounties`} in this repository:

${bountyList}

**To claim a bounty:**  
Edit your PR title or description to reference the issue number (e.g., "Fix #${highestBounty.issueNumber}" or "Closes #${highestBounty.issueNumber}").

The bounty will be automatically linked and paid when your PR is merged.

${BRAND_SIGNATURE}`;
  
  await postIssueComment(octokit, owner, repo, pull_request.number, comment);
}

/**
 * Handle PR that has bounty references
 */
async function handlePRWithBounties(octokit, owner, repo, pull_request, repository, bounties) {
  // Check if user has linked wallet
  const walletMapping = await walletQueries.findByGithubId(pull_request.user.id);
  
  // Build bounty summary
  const totalAmount = bounties.reduce((sum, b) => {
    const decimals = b.tokenSymbol === 'MUSD' ? 18 : 6;
    return sum + Number(ethers.formatUnits(b.amount, decimals));
  }, 0);
  
  const tokenSymbol = bounties[0].tokenSymbol || 'USDC';
  const issueLinks = bounties.map(b => `[#${b.issueNumber}](https://github.com/${repository.full_name}/issues/${b.issueNumber})`).join(', ');
  
  const prUrl = `https://github.com/${repository.full_name}/pull/${pull_request.number}`;
  
  if (!walletMapping) {
    // Prompt user to link wallet
    const comment = `## <img src="${OG_ICON}" alt="BountyPay Icon" width="20" height="20" /> Bounty: Linked to PR

**Claim:** ${issueLinks}  
**Value:** ${totalAmount.toFixed(2)} ${tokenSymbol}  
**Status:** Wallet required

<a href="${FRONTEND_BASE}/link-wallet?returnTo=${encodeURIComponent(prUrl)}" target="_blank" rel="noopener noreferrer">
  <img src="https://img.shields.io/badge/Link_Wallet-00827B?style=for-the-badge&logo=ethereum&logoColor=white" alt="Link Wallet" />
</a>

**Next steps:**
1. Link your wallet (free, takes 30 seconds)
2. Merge this PR
3. Payment sent automatically

${BRAND_SIGNATURE}`;

    await postIssueComment(octokit, owner, repo, pull_request.number, comment);
  } else {
    // User already has wallet linked
    const comment = `## <img src="${OG_ICON}" alt="BountyPay Icon" width="20" height="20" /> Bounty: Ready to Pay

**Claim:** ${issueLinks}  
**Value:** ${totalAmount.toFixed(2)} ${tokenSymbol}  
**Recipient:** \`${walletMapping.walletAddress.slice(0, 6)}...${walletMapping.walletAddress.slice(-4)}\`

When this PR is merged, payment will be sent automatically to your linked wallet.

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
      console.error('Failed to record PR claim:', claimError.message);
      
      await notifyMaintainers(octokit, owner, repo, pull_request.number, {
        errorType: 'PR Claim Recording Failed',
        errorMessage: claimError.message,
        severity: 'critical',
        bountyId: bounty.bountyId,
        network: bounty.network,
        prNumber: pull_request.number,
        username: pull_request.user.login,
        context: `Failed to record this PR as a claim for bounty ${bounty.bountyId}. This will prevent automatic payout when the PR is merged.`
      });
    }
  }
}

/**
 * Handle 'pull_request.closed' webhook (merged)
 */
export async function handlePRMerged(payload) {
  const { pull_request, repository, installation } = payload;
  
  if (!pull_request.merged) {
    return;
  }
  
  try{
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
      
      if (!bounty || bounty.status !== 'open') {
        continue;
      }
      
      const walletMapping = await walletQueries.findByGithubId(claim.prAuthorGithubId);
    
      if (!walletMapping) {
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
      
      if (!ethers.isAddress(walletMapping.walletAddress)) {
        console.error('Invalid wallet address in database');
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
      
      if (!bounty.network) {
        console.error('Bounty has no network configured:', bounty.bountyId);
        await notifyMaintainers(octokit, owner, repo, pull_request.number, {
          errorType: 'Missing Network Configuration',
          errorMessage: 'Bounty record is missing network alias',
          severity: 'critical',
          bountyId: bounty.bountyId,
          recipientAddress: walletMapping.walletAddress,
          prNumber: pull_request.number,
          username: pull_request.user.login,
          context: 'This bounty was created without a network alias. Manual intervention required to identify the correct network and process payment.'
        });
        continue;
      }
      
      let result;
      try {
        result = await resolveBountyOnNetwork(
          bounty.bountyId,
          walletMapping.walletAddress,
          bounty.network
        );
      } catch (error) {
        console.error('Exception during bounty resolution:', error.message);
        result = { success: false, error: error.message || 'Unknown error during resolution' };
      }
    
    if (result.success) {
      // Update DB
        await bountyQueries.updateStatus(bounty.bountyId, 'resolved', result.txHash);
      await prClaimQueries.updateStatus(claim.id, 'paid', result.txHash, Date.now());
      
      // Post success comment on PR
      const tokenSymbol = bounty.tokenSymbol || 'UNKNOWN';
      const amountFormatted = formatAmountByToken(bounty.amount, tokenSymbol);
      const net = networkMeta(bounty.network);
        const successComment = `## <img src="${OG_ICON}" alt="BountyPay Icon" width="20" height="20" /> Bounty: Paid

**Recipient:** @${pull_request.user.login}  
**Amount:** ${amountFormatted} ${tokenSymbol}  
**Transaction:** <a href="${net.explorerTx(result.txHash)}" target="_blank" rel="noopener noreferrer">View on Explorer</a>

Payment has been sent successfully.

${BRAND_SIGNATURE}`;

      await postIssueComment(octokit, owner, repo, pull_request.number, successComment);
      
      // Update original issue's bounty comment
        if (bounty.pinnedCommentId) {
          const updatedSummary = `## <img src="${OG_ICON}" alt="BountyPay Icon" width="20" height="20" /> Bounty: Resolved

**Paid to:** @${pull_request.user.login}  
**Amount:** ${amountFormatted} ${tokenSymbol}  
**Transaction:** <a href="${net.explorerTx(result.txHash)}" target="_blank" rel="noopener noreferrer">View on Explorer</a>

${BRAND_SIGNATURE}`;

          await updateComment(octokit, owner, repo, bounty.pinnedCommentId, updatedSummary);
      }
      } else {
        console.error('Bounty resolution failed:', result.error);
        
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

**Network:** ${bounty.network || 'UNKNOWN'}  
**Recipient:** \`${walletMapping.walletAddress.slice(0, 10)}...${walletMapping.walletAddress.slice(-8)}\`

${BRAND_SIGNATURE}`;

      await postIssueComment(octokit, owner, repo, pull_request.number, errorComment);
      await prClaimQueries.updateStatus(claim.id, 'failed');
        
        // Notify maintainers for critical/high severity errors
        if (shouldNotify) {
          const tokenSymbol = bounty.tokenSymbol || 'UNKNOWN';
          const amountFormatted = formatAmountByToken(bounty.amount, tokenSymbol);
          
          await notifyMaintainers(octokit, owner, repo, pull_request.number, {
            errorType: 'Bounty Payout Failed',
            errorMessage: result.error,
            severity: notifySeverity,
            bountyId: bounty.bountyId,
            network: bounty.network || 'UNKNOWN',
            recipientAddress: walletMapping.walletAddress,
            prNumber: pull_request.number,
            username: pull_request.user.login,
            context: `**Bounty Amount:** ${amountFormatted} ${tokenSymbol}\n**PR Merged:** Yes\n**Claim ID:** ${claim.id}\n\nAutomated payout failed when PR was merged. Manual resolution required.`
          });
        }
      }
    }
  } catch (error) {
    console.error('Error in handlePRMerged:', error.message);
    
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
      console.error('Could not notify maintainers:', notifyError.message);
    }
    
    throw error;
  }
}

/**
 * Main webhook router
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
