import { ethers } from 'ethers';
import { getOctokit, postIssueComment, updateComment, extractClosedIssues, extractMentionedIssues } from '../client.js';
import { bountyQueries, walletQueries, prClaimQueries } from '../../db/prisma.js';
import { resolveBountyOnNetwork } from '../../blockchain/contract.js';
import { OG_ICON, BRAND_SIGNATURE, networkMeta, notifyMaintainers } from './notificationHelpers.js';
import { CONFIG } from '../../config.js';

const FRONTEND_BASE = CONFIG.frontendUrl.replace(/\/$/, '');

/**
 * Formats token amount for display
 */
function formatAmountByToken(amount, tokenSymbol) {
  const decimals = tokenSymbol === 'MUSD' ? 18 : 6;
  try {
    return ethers.formatUnits(amount, decimals);
  } catch {
    return amount;
  }
}

/**
 * Suggests available bounties when PR doesn't reference any
 */
async function suggestBounties(octokit, owner, repo, pull_request, bounties) {
  if (bounties.length === 0) return;
  
  let bountyList = '';
  for (const bounty of bounties.slice(0, 5)) {
    const tokenSymbol = bounty.tokenSymbol || 'USDC';
    const amountFormatted = formatAmountByToken(bounty.amount, tokenSymbol);
    bountyList += `- [#${bounty.issueNumber}](https://github.com/${bounty.repoFullName}/issues/${bounty.issueNumber}) - ${amountFormatted} ${tokenSymbol}\n`;
  }
  
  const highestBounty = bounties[0];
  
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
 * Handles PR that has bounty references
 */
async function handlePRWithBounties(octokit, owner, repo, pull_request, repository, bounties) {
  const walletMapping = await walletQueries.findByGithubId(pull_request.user.id);
  
  const totalAmount = bounties.reduce((sum, b) => {
    const decimals = b.tokenSymbol === 'MUSD' ? 18 : 6;
    return sum + Number(ethers.formatUnits(b.amount, decimals));
  }, 0);
  
  const tokenSymbol = bounties[0].tokenSymbol || 'USDC';
  const issueLinks = bounties.map(b => `[#${b.issueNumber}](https://github.com/${repository.full_name}/issues/${b.issueNumber})`).join(', ');
  const prUrl = `https://github.com/${repository.full_name}/pull/${pull_request.number}`;
  
  if (!walletMapping) {
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
 * Handles 'pull_request.opened' webhook event
 * Links PR to bounties and notifies user
 */
export async function handlePROpened(payload) {
  const { pull_request, repository, installation } = payload;
  
  try {
    const octokit = await getOctokit(installation.id);
    const [owner, repo] = repository.full_name.split('/');
    
    const environment = process.env.ENV_TARGET || 'stage';
    const allOpenBounties = await bountyQueries.getAllOpen(repository.id, environment);
    
    if (allOpenBounties.length === 0) return;
    
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
 * Handles 'pull_request.closed' webhook event when PR is merged
 * Triggers automatic payout to contributor
 */
export async function handlePRMerged(payload) {
  const { pull_request, repository, installation } = payload;
  
  if (!pull_request.merged) return;
  
  try {
    const claims = await prClaimQueries.findByPR(repository.full_name, pull_request.number);
    if (claims.length === 0) return;
    
    const octokit = await getOctokit(installation.id);
    const [owner, repo] = repository.full_name.split('/');
    
    for (const claim of claims) {
      const bounty = await bountyQueries.findById(claim.bountyId);
      
      if (!bounty || bounty.status !== 'open') continue;
      
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
      
      let result;
      try {
        result = await resolveBountyOnNetwork(
          bounty.bountyId,
          walletMapping.walletAddress,
          bounty.network || 'BASE_SEPOLIA'
        );
      } catch (error) {
        console.error('Exception during bounty resolution:', error.message);
        result = { success: false, error: error.message || 'Unknown error during resolution' };
      }
      
      if (result.success) {
        await bountyQueries.updateStatus(bounty.bountyId, 'resolved', result.txHash);
        await prClaimQueries.updateStatus(claim.id, 'paid', result.txHash, Date.now());
        
        const tokenSymbol = bounty.tokenSymbol || 'USDC';
        const amountFormatted = formatAmountByToken(bounty.amount, tokenSymbol);
        const net = networkMeta(bounty.network || 'BASE_SEPOLIA');
        const successComment = `## <img src="${OG_ICON}" alt="BountyPay Icon" width="20" height="20" /> Bounty: Paid

**Recipient:** @${pull_request.user.login}  
**Amount:** ${amountFormatted} ${tokenSymbol}  
**Transaction:** <a href="${net.explorerTx(result.txHash)}" target="_blank" rel="noopener noreferrer">View on Explorer</a>

Payment has been sent successfully.

${BRAND_SIGNATURE}`;

        await postIssueComment(octokit, owner, repo, pull_request.number, successComment);
        
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
          shouldNotify = false;
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
    console.error('Error in handlePRMerged:', error.message);
    
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

