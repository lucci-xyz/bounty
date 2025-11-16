import { ethers } from 'ethers';
import { getOctokit, postIssueComment, ensureLabel, addLabels } from '../client.js';
import { bountyQueries } from '../../db/prisma.js';
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
 * Handles bounty creation notification after on-chain funding
 * Posts bounty summary comment on the GitHub issue
 */
export async function handleBountyCreated(bountyData) {
  const { 
    repoFullName, 
    issueNumber, 
    bountyId, 
    amount, 
    deadline, 
    sponsorAddress, 
    txHash, 
    installationId, 
    network = 'BASE_SEPOLIA', 
    tokenSymbol = 'USDC' 
  } = bountyData;
  
  try {
    const octokit = await getOctokit(installationId);
    const [owner, repo] = repoFullName.split('/');
    
    const deadlineDate = new Date(deadline * 1000).toISOString().split('T')[0];
    const amountFormatted = formatAmountByToken(amount, tokenSymbol);
    const net = networkMeta(network);
    
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
    
    // Add bounty label
    const labelName = `bounty:$${Math.floor(parseFloat(amountFormatted))}`;
    try {
      await ensureLabel(octokit, owner, repo, labelName, '83EEE8', 'Active bounty amount');
      await addLabels(octokit, owner, repo, issueNumber, [labelName]);
    } catch (error) {
      // Label operations are non-critical
    }
    
    // Update DB with comment ID
    try {
      await bountyQueries.updatePinnedComment(bountyId, comment.id);
    } catch (dbError) {
      console.error('Failed to update pinned comment ID:', dbError.message);
      
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

