import { logger } from '@/lib/logger';
import {
  getOctokit,
  postIssueComment,
  updateComment,
  extractClosedIssues,
  extractMentionedIssues
} from '../../client.js';
import { bountyQueries, walletQueries, prClaimQueries, userQueries } from '@/server/db/prisma.js';
import { resolveBountyOnNetwork } from '@/server/blockchain/contract.js';
import { ethers } from 'ethers';
import { notifyMaintainers } from '../../services/maintainerAlerts.js';
import { formatAmountByToken, networkMeta } from '../../services/bountyFormatting.js';
import {
  renderPrLinkedComment,
  renderPaymentFailedComment,
  renderPaymentSentComment,
  renderPrReadyComment,
  renderBountyResolvedComment,
  renderOpenBountiesComment,
  renderWalletRequiredComment,
  renderWalletInvalidComment
} from '../../templates/bounties';
import { BRAND_SIGNATURE, FRONTEND_BASE, OG_ICON } from '../../constants.js';
import { getLinkHref } from '@/config/links';
import {
  sendPrOpenedEmail,
  sendBountyPaidEmail
} from '@/integrations/email/email.js';

const getIssueUrl = (repoFullName, issueNumber) => getLinkHref('github', 'issue', { repoFullName, issueNumber });
const getPullUrl = (repoFullName, prNumber) => getLinkHref('github', 'pullRequest', { repoFullName, prNumber });

export async function handlePullRequestOpened(payload) {
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

    if (allOpenBounties.length === 1 && closedIssues.length === 0 && mentionedIssues.length === 0) {
      await handlePRWithBounties(octokit, owner, repo, pull_request, repository, allOpenBounties);
      return;
    }

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
    logger.error('Error in handlePullRequestOpened:', error.message);

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
      logger.error('Could not notify maintainers:', notifyError);
    }

    throw error;
  }
}

export async function handlePullRequestMerged(payload) {
  const { pull_request, repository, installation } = payload;

  if (!pull_request.merged) {
    return;
  }

  try {
    const claims = await prClaimQueries.findByPR(repository.full_name, pull_request.number);

    if (claims.length === 0) {
      return;
    }

    const octokit = await getOctokit(installation.id);
    const [owner, repo] = repository.full_name.split('/');

    for (const claim of claims) {
      const bounty = await bountyQueries.findById(claim.bountyId);

      if (!bounty || bounty.status !== 'open') {
        continue;
      }

      const walletMapping = await walletQueries.findByGithubId(claim.prAuthorGithubId);

      if (!walletMapping) {
        const issueUrl = getIssueUrl(repository.full_name, bounty.issueNumber);
        const comment = renderWalletRequiredComment({
          iconUrl: OG_ICON,
          username: pull_request.user.login,
          linkWalletUrl: `${FRONTEND_BASE}/app/link-wallet?returnTo=${encodeURIComponent(issueUrl)}`,
          brandSignature: BRAND_SIGNATURE
        });

        await postIssueComment(octokit, owner, repo, pull_request.number, comment);
        await prClaimQueries.updateStatus(claim.id, 'pending_wallet');
        continue;
      }

      if (!ethers.isAddress(walletMapping.walletAddress)) {
        logger.error('Invalid wallet address in database');
        const issueUrl = getIssueUrl(repository.full_name, bounty.issueNumber);
        const comment = renderWalletInvalidComment({
          iconUrl: OG_ICON,
          username: pull_request.user.login,
          invalidAddress: walletMapping.walletAddress,
          linkWalletUrl: `${FRONTEND_BASE}/app/link-wallet?returnTo=${encodeURIComponent(issueUrl)}`,
          brandSignature: BRAND_SIGNATURE
        });

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

      if (!bounty.network) {
        logger.error('Bounty has no network configured:', bounty.bountyId);
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
        result = await resolveBountyOnNetwork(bounty.bountyId, walletMapping.walletAddress, bounty.network);
      } catch (error) {
        logger.error('Exception during bounty resolution:', error.message);
        result = { success: false, error: error.message || 'Unknown error during resolution' };
      }

      if (result.success) {
        await bountyQueries.updateStatus(bounty.bountyId, 'resolved', result.txHash);
        await prClaimQueries.updateStatus(claim.id, 'paid', result.txHash, Date.now());

        const tokenSymbol = bounty.tokenSymbol || 'UNKNOWN';
        const amountFormatted = formatAmountByToken(bounty.amount, tokenSymbol);
        const net = networkMeta(bounty.network);
        const explorerUrl = net.explorerTx(result.txHash);
        const successComment = renderPaymentSentComment({
          iconUrl: OG_ICON,
          username: pull_request.user.login,
          amountFormatted,
          tokenSymbol,
          txUrl: explorerUrl,
          brandSignature: BRAND_SIGNATURE
        });

        await postIssueComment(octokit, owner, repo, pull_request.number, successComment);

        if (bounty.pinnedCommentId) {
          const updatedSummary = renderBountyResolvedComment({
            iconUrl: OG_ICON,
            username: pull_request.user.login,
            amountFormatted,
            tokenSymbol,
            txUrl: explorerUrl,
            brandSignature: BRAND_SIGNATURE
          });

          await updateComment(octokit, owner, repo, bounty.pinnedCommentId, updatedSummary);
        }

        const contributor = await userQueries.findByGithubId(claim.prAuthorGithubId);
        if (contributor?.email) {
          await sendBountyPaidEmail({
            to: contributor.email,
            username: contributor.githubUsername,
            bountyAmount: amountFormatted,
            tokenSymbol,
            issueNumber: bounty.issueNumber,
            issueTitle: bounty.issueTitle || '',
            repoFullName: bounty.repoFullName,
            txUrl: explorerUrl,
            frontendUrl: FRONTEND_BASE
          });
        }
      } else {
        logger.error('Bounty resolution failed:', result.error);

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

        const errorComment = renderPaymentFailedComment({
          iconUrl: OG_ICON,
          errorSnippet: `${result.error.substring(0, 200)}${result.error.length > 200 ? '...' : ''}`,
          helpText: errorHelp,
          network: bounty.network,
          recipientAddress: `${walletMapping.walletAddress.slice(0, 10)}...${walletMapping.walletAddress.slice(-8)}`,
          brandSignature: BRAND_SIGNATURE
        });

        await postIssueComment(octokit, owner, repo, pull_request.number, errorComment);
        await prClaimQueries.updateStatus(claim.id, 'failed');

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
    logger.error('Error in handlePullRequestMerged:', error.message);

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
      logger.error('Could not notify maintainers:', notifyError.message);
    }

    throw error;
  }
}

async function suggestBounties(octokit, owner, repo, pull_request, bounties) {
  if (bounties.length === 0) return;

  let bountyList = '';
  for (const bounty of bounties.slice(0, 5)) {
    const tokenSymbol = bounty.tokenSymbol || 'USDC';
    const amountFormatted = formatAmountByToken(bounty.amount, tokenSymbol);
    const issueUrl = getIssueUrl(bounty.repoFullName, bounty.issueNumber);
    bountyList += `- [#${bounty.issueNumber}](${issueUrl}) - ${amountFormatted} ${tokenSymbol}\n`;
  }

  const highestBounty = bounties[0];

  const comment = renderOpenBountiesComment({
    iconUrl: OG_ICON,
    username: pull_request.user.login,
    bountyCount: bounties.length,
    bountyList,
    exampleIssueNumber: highestBounty.issueNumber,
    brandSignature: BRAND_SIGNATURE
  });

  await postIssueComment(octokit, owner, repo, pull_request.number, comment);
}

async function handlePRWithBounties(octokit, owner, repo, pull_request, repository, bounties) {
  const walletMapping = await walletQueries.findByGithubId(pull_request.user.id);

  const totalAmount = bounties.reduce((sum, b) => {
    const decimals = b.tokenSymbol === 'MUSD' ? 18 : 6;
    return sum + Number(ethers.formatUnits(b.amount, decimals));
  }, 0);

  const tokenSymbol = bounties[0].tokenSymbol || 'USDC';
  const issueLinks = bounties
    .map((b) => `[#${b.issueNumber}](${getIssueUrl(repository.full_name, b.issueNumber)})`)
    .join(', ');

  const prUrl = getPullUrl(repository.full_name, pull_request.number);

  if (!walletMapping) {
    const comment = renderPrLinkedComment({
      iconUrl: OG_ICON,
      issueLinks,
      totalAmount: totalAmount.toFixed(2),
      tokenSymbol,
      linkWalletUrl: `${FRONTEND_BASE}/app/link-wallet?returnTo=${encodeURIComponent(prUrl)}`,
      brandSignature: BRAND_SIGNATURE
    });

    await postIssueComment(octokit, owner, repo, pull_request.number, comment);
  } else {
    const comment = renderPrReadyComment({
      iconUrl: OG_ICON,
      issueLinks,
      totalAmount: totalAmount.toFixed(2),
      tokenSymbol,
      walletDisplay: `${walletMapping.walletAddress.slice(0, 6)}...${walletMapping.walletAddress.slice(-4)}`,
      brandSignature: BRAND_SIGNATURE
    });

    await postIssueComment(octokit, owner, repo, pull_request.number, comment);
  }

  for (const bounty of bounties) {
    try {
      await prClaimQueries.create(bounty.bountyId, pull_request.number, pull_request.user.id, repository.full_name);
    } catch (claimError) {
      logger.error('Failed to record PR claim:', claimError.message);

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

  // Send email notification to bounty sponsors (non-blocking)
  try {
    // Get unique sponsors from all bounties
    const uniqueSponsors = new Map();
    for (const bounty of bounties) {
      if (bounty.sponsorGithubId && !uniqueSponsors.has(bounty.sponsorGithubId)) {
        uniqueSponsors.set(bounty.sponsorGithubId, bounty);
      }
    }

    // Send email to each unique sponsor
    for (const [sponsorGithubId, bounty] of uniqueSponsors) {
      try {
        const sponsor = await userQueries.findByGithubId(sponsorGithubId);
        if (sponsor?.email) {
          await sendPrOpenedEmail({
            to: sponsor.email,
            username: sponsor.githubUsername,
            prNumber: pull_request.number,
            prTitle: pull_request.title,
            prAuthor: pull_request.user.login,
            repoFullName: repository.full_name,
            bountyAmount: totalAmount.toFixed(2),
            tokenSymbol,
            issueNumber: bounty.issueNumber,
            frontendUrl: FRONTEND_BASE
          });
        }
      } catch (sponsorError) {
        // Log but continue with other sponsors
        logger.warn(`Failed to send PR opened email to sponsor ${sponsorGithubId}:`, sponsorError.message);
      }
    }
  } catch (emailError) {
    // Non-blocking - log but don't fail the webhook
    logger.warn('Failed to send PR opened email:', emailError.message);
  }
}
