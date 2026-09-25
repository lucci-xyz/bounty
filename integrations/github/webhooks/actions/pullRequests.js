import { logger } from '@/lib/logger';
import { newErrorRef, publicErrorMessage } from '@/lib/errorRef';
import {
  getOctokit,
  postIssueComment,
  extractClosedIssues,
  extractMentionedIssues
} from '../../client.js';
import {
  bountyQueries,
  walletQueries,
  prClaimQueries,
  userQueries
} from '@/server/db/prisma.js';
import { settleClaim, SETTLEMENT, RESOLVE_GRACE_SECONDS } from '@/server/payouts';
import { UNPAID_CLAIM_STATUSES } from '@/lib/claimStatus';
import { ethers } from 'ethers';
import { notifyMaintainers } from '../../services/maintainerAlerts.js';
import { formatAmountByToken } from '../../services/bountyFormatting.js';
import { announcePayout } from '../../services/payoutAnnouncements.js';
import {
  renderPrLinkedComment,
  renderPaymentFailedComment,
  renderPrReadyComment,
  renderOpenBountiesComment,
  renderWalletRequiredComment,
  renderWalletInvalidComment
} from '../../templates/bounties';
import { BRAND_SIGNATURE, FRONTEND_BASE, OG_ICON } from '../../constants.js';
import { getLinkHref } from '@/config/links';
import { sendPrOpenedEmail } from '@/integrations/email/email.js';

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

    // A claim may only be created from an EXPLICIT closing reference.
    //
    // Previously two other paths created claims, and both were payable:
    //   - a repo with exactly one open bounty auto-claimed it for any PR, so a
    //     one-line typo fix claimed the whole bounty; and
    //   - a bare mention ("blocked on #42") claimed the bounty on #42.
    // Since `handlePullRequestMerged` pays every claim attached to the merged
    // PR, either path let an unrelated PR drain a funded bounty on merge.
    const closedIssues = [...new Set(extractClosedIssues(pull_request.body))];
    const mentionedIssues = extractMentionedIssues(pull_request.title, pull_request.body);

    const claimedBounties = [];
    for (const issueNumber of closedIssues) {
      const issueBounties = await bountyQueries.findByIssue(repository.id, issueNumber);
      claimedBounties.push(...issueBounties);
    }

    if (claimedBounties.length > 0) {
      await handlePRWithBounties(octokit, owner, repo, pull_request, repository, claimedBounties);
      return;
    }

    // No closing reference: surface the relevant bounties as a non-binding hint
    // so the author can add "Closes #N" — but record no claim.
    const mentionedBounties = [];
    for (const issueNumber of mentionedIssues) {
      const issueBounties = await bountyQueries.findByIssue(repository.id, issueNumber);
      mentionedBounties.push(...issueBounties);
    }

    await suggestBounties(
      octokit,
      owner,
      repo,
      pull_request,
      mentionedBounties.length > 0 ? mentionedBounties : allOpenBounties
    );
  } catch (error) {
    logger.error('Error in handlePullRequestOpened:', error.message);

    try {
      const octokit = await getOctokit(installation.id);
      const [owner, repo] = repository.full_name.split('/');

      await notifyMaintainers(octokit, owner, repo, pull_request.number, {
        errorType: 'PR Open Handler Error',
        errorMessage: publicErrorMessage(logPublicError(error)),
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

    // Authoritative payout gate.
    //
    // Claims are recorded when a PR is opened, but the PR body can change
    // afterwards and claims are never withdrawn. Re-derive the closing
    // references from the MERGE payload and pay only bounties whose issue this
    // PR actually closes. Without this, any claim recorded at any earlier point
    // was payable on merge.
    const closingIssues = new Set(extractClosedIssues(pull_request.body));

    // One claim's failure must not abandon the others: a PR closing two
    // bountied issues used to stop after the first if posting its comment
    // threw. Settle every claim, then surface the first error.
    let firstError = null;

    for (const claim of claims) {
      try {
        const bounty = await bountyQueries.findById(claim.bountyId);

        if (!bounty || bounty.status !== 'open') {
          continue;
        }

        if (!closingIssues.has(Number(bounty.issueNumber))) {
          logger.warn('Skipping payout: merged PR does not close the bountied issue', {
            bountyId: bounty.bountyId,
            issueNumber: bounty.issueNumber,
            prNumber: pull_request.number,
            repo: repository.full_name
          });
          continue;
        }

        // This claim has passed the merge gate. Record that before settling: the
        // marker is what lets the contributor collect it later (by linking a
        // wallet or retrying) if this attempt does not pay.
        const verifiedClaim = (await prClaimQueries.markMergeVerified(claim.id)) || claim;

        // The gate above is also what makes a `pending` claim payable, so this
        // is the one caller allowed to settle from it.
        const settlement = await settleClaim(verifiedClaim, { payableStatuses: UNPAID_CLAIM_STATUSES });

        await reportMergeSettlement({ octokit, owner, repo, pull_request, repository, claim, settlement });
      } catch (error) {
        logger.error('Error settling claim on merge:', { claimId: claim.id, error: error.message });
        firstError = firstError || error;
      }
    }

    if (firstError) {
      throw firstError;
    }
  } catch (error) {
    logger.error('Error in handlePullRequestMerged:', error.message);

    try {
      const octokit = await getOctokit(installation.id);
      const [owner, repo] = repository.full_name.split('/');

      await notifyMaintainers(octokit, owner, repo, pull_request.number, {
        errorType: 'PR Merge Handler Error',
        errorMessage: publicErrorMessage(logPublicError(error)),
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

/**
 * Post the GitHub side of one merge-time settlement: the contributor-facing
 * comment on the PR and, where someone must act, a maintainer alert.
 */
async function reportMergeSettlement({ octokit, owner, repo, pull_request, repository, claim, settlement }) {
  const { outcome, bounty } = settlement;
  const username = pull_request.user.login;
  const prNumber = pull_request.number;
  const linkWalletUrl = () => {
    const issueUrl = getIssueUrl(repository.full_name, bounty.issueNumber);
    return `${FRONTEND_BASE}/app/link-wallet?returnTo=${encodeURIComponent(issueUrl)}`;
  };

  switch (outcome) {
    case SETTLEMENT.PAID: {
      await announcePayout({
        octokit,
        repoFullName: repository.full_name,
        prNumber,
        username,
        contributorGithubId: claim.prAuthorGithubId,
        bounty,
        txHash: settlement.txHash
      });

      if (settlement.recordError) {
        // Paid on-chain, but the database may still show the bounty open.
        await notifyMaintainers(octokit, owner, repo, prNumber, {
          errorType: 'Payout Sent But Not Recorded',
          errorMessage: publicErrorMessage(logPublicError(settlement.recordError)),
          severity: 'critical',
          bountyId: bounty.bountyId,
          network: bounty.network,
          txHash: settlement.txHash,
          prNumber,
          username,
          context: `The transfer succeeded on-chain but updating the database failed. Mark bounty ${bounty.bountyId} resolved and claim ${claim.id} paid with this transaction hash. Do not retry the payout.`
        });
      }
      return;
    }

    case SETTLEMENT.NEEDS_WALLET: {
      const comment = renderWalletRequiredComment({
        iconUrl: OG_ICON,
        username,
        linkWalletUrl: linkWalletUrl(),
        payoutDeadline: formatPayoutDeadline(bounty),
        brandSignature: BRAND_SIGNATURE
      });
      await postIssueComment(octokit, owner, repo, prNumber, comment);
      return;
    }

    case SETTLEMENT.INVALID_WALLET: {
      logger.error('Invalid wallet address in database');
      const comment = renderWalletInvalidComment({
        iconUrl: OG_ICON,
        username,
        invalidAddress: settlement.recipient,
        linkWalletUrl: linkWalletUrl(),
        brandSignature: BRAND_SIGNATURE
      });
      await postIssueComment(octokit, owner, repo, prNumber, comment);

      await notifyMaintainers(octokit, owner, repo, prNumber, {
        errorType: 'Invalid Wallet Address in Database',
        errorMessage: `User ${username} (GitHub ID: ${claim.prAuthorGithubId}) has an invalid wallet address: ${settlement.recipient}`,
        severity: 'high',
        bountyId: bounty.bountyId,
        network: bounty.network,
        recipientAddress: settlement.recipient,
        prNumber,
        username,
        context: 'This indicates a data integrity issue in the wallet_mappings table. Re-linking a valid wallet pays the contributor automatically.'
      });
      return;
    }

    case SETTLEMENT.NOT_ALLOWLISTED: {
      logger.warn('Skipping payout: recipient is not on the sponsor allowlist', {
        bountyId: bounty.bountyId,
        prNumber
      });

      await notifyMaintainers(octokit, owner, repo, prNumber, {
        errorType: 'Recipient Not On Sponsor Allowlist',
        errorMessage:
          'The sponsor restricted this bounty to specific wallet addresses, and the linked wallet is not one of them.',
        severity: 'medium',
        bountyId: bounty.bountyId,
        network: bounty.network,
        prNumber,
        username,
        context:
          'No payout was attempted. The sponsor can add this address to the allowlist and the contributor can retry from their dashboard, or the contributor can link an allowed wallet, which pays automatically.'
      });
      return;
    }

    case SETTLEMENT.WINDOW_CLOSED: {
      await reportPayoutFailure({
        octokit,
        owner,
        repo,
        pull_request,
        claim,
        bounty,
        recipient: settlement.recipient,
        errorRef: logPublicError(new Error(settlement.error || `Settlement window closed at ${settlement.closedAt}`)),
        helpText: `The payout window for this bounty closed on ${formatUtc(settlement.closedAt)}, so the escrow no longer accepts a payout. The sponsor can reclaim the funds.`,
        severity: 'medium'
      });
      return;
    }

    case SETTLEMENT.CHAIN_FAILED: {
      // Classify server-side against the raw text, but publish only a
      // reference. An ethers/provider message carries the configured RPC URL
      // — commonly with an embedded API key — plus the upstream response
      // body, and this comment is world-readable and permanent.
      const { helpText, severity, notify } = classifyPayoutError(settlement.error);
      await reportPayoutFailure({
        octokit,
        owner,
        repo,
        pull_request,
        claim,
        bounty,
        recipient: settlement.recipient,
        errorRef: logPublicError(new Error(settlement.error || 'Unknown resolution error')),
        helpText,
        severity: notify ? severity : null
      });
      return;
    }

    case SETTLEMENT.NO_NETWORK: {
      logger.error('Bounty has no network configured:', bounty.bountyId);
      await notifyMaintainers(octokit, owner, repo, prNumber, {
        errorType: 'Missing Network Configuration',
        errorMessage: 'Bounty record is missing network alias',
        severity: 'critical',
        bountyId: bounty.bountyId,
        prNumber,
        username,
        context: `This bounty was created without a network alias. Set the correct network on bounty ${bounty.bountyId}; the contributor can then collect claim ${claim.id} from their dashboard.`
      });
      return;
    }

    case SETTLEMENT.SKIPPED: {
      logger.info('Merge settlement skipped', { claimId: claim.id, reason: settlement.reason });
      return;
    }

    default:
      logger.error('Unhandled settlement outcome', { claimId: claim.id, outcome });
  }
}

/**
 * Post the public "payment issue" comment and, unless `severity` is null, alert
 * maintainers. Only the error reference is published.
 */
async function reportPayoutFailure({ octokit, owner, repo, pull_request, claim, bounty, recipient, errorRef, helpText, severity }) {
  const errorComment = renderPaymentFailedComment({
    iconUrl: OG_ICON,
    errorSnippet: publicErrorMessage(errorRef),
    helpText,
    network: bounty.network,
    recipientAddress: recipient ? `${recipient.slice(0, 10)}...${recipient.slice(-8)}` : 'n/a',
    brandSignature: BRAND_SIGNATURE
  });

  await postIssueComment(octokit, owner, repo, pull_request.number, errorComment);

  if (!severity) return;

  const tokenSymbol = bounty.tokenSymbol || 'UNKNOWN';
  const amountFormatted = formatAmountByToken(bounty.amount, tokenSymbol);

  await notifyMaintainers(octokit, owner, repo, pull_request.number, {
    errorType: 'Bounty Payout Failed',
    errorMessage: publicErrorMessage(errorRef),
    severity,
    bountyId: bounty.bountyId,
    network: bounty.network || 'UNKNOWN',
    recipientAddress: recipient || undefined,
    prNumber: pull_request.number,
    username: pull_request.user.login,
    context: `**Bounty Amount:** ${amountFormatted} ${tokenSymbol}\n**PR Merged:** Yes\n**Claim ID:** ${claim.id}\n\nAutomated payout failed when PR was merged. The contributor can retry from their dashboard once the cause is fixed.`
  });
}

/**
 * Map a raw resolution error to contributor-facing help and alert severity.
 * Reads the raw text; returns nothing derived from it.
 */
function classifyPayoutError(rawError) {
  const errorLower = (rawError || '').toLowerCase();

  if (errorLower.includes('batch') || errorLower.includes('drpc')) {
    return {
      helpText: 'This looks like an RPC provider issue. The team has been notified and will retry the payout.',
      severity: 'critical',
      notify: true
    };
  }
  if (errorLower.includes('insufficient') || errorLower.includes('balance')) {
    return {
      helpText: 'The contract may not have sufficient funds. The team needs to top up the escrow contract.',
      severity: 'critical',
      notify: true
    };
  }
  if (errorLower.includes('gas')) {
    return {
      helpText: 'Transaction failed due to gas estimation issues. The team will retry with adjusted gas settings.',
      severity: 'high',
      notify: true
    };
  }
  if (errorLower.includes('not open') || errorLower.includes('notopen')) {
    return {
      helpText: 'This bounty may have already been claimed. Please check the bounty status.',
      severity: 'low',
      notify: false
    };
  }
  if (errorLower.includes('deadline')) {
    return {
      helpText: 'The bounty deadline may have passed. Team will review and potentially refund.',
      severity: 'medium',
      notify: true
    };
  }
  return { helpText: 'Tag a maintainer to investigate and replay the payout.', severity: 'high', notify: true };
}

/** A unix time in seconds as `YYYY-MM-DD HH:MM UTC`. */
function formatUtc(seconds) {
  return `${new Date(seconds * 1000).toISOString().slice(0, 16).replace('T', ' ')} UTC`;
}

/**
 * Last moment the escrow accepts a payout for this bounty, for telling a
 * contributor how long they have. `null` when unknown or already past.
 */
function formatPayoutDeadline(bounty) {
  const deadline = Number(bounty?.deadline);
  if (!Number.isFinite(deadline) || deadline <= 0) return null;
  const closesAt = deadline + RESOLVE_GRACE_SECONDS;
  if (closesAt * 1000 <= Date.now()) return null;
  return formatUtc(closesAt);
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
        errorMessage: publicErrorMessage(logPublicError(claimError)),
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

/**
 * Log an error server-side and return a reference safe to publish.
 *
 * notifyMaintainers writes a comment on a public issue or pull request, so the
 * raw text must never travel with it: stack traces expose server paths, and
 * provider errors carry the RPC URL (often with an embedded API key) plus the
 * upstream response body.
 *
 * @param {Error|{message?: string}} error
 * @returns {string} Correlation reference recorded in the server log.
 */
function logPublicError(error) {
  const ref = newErrorRef();
  logger.error(`[${ref}]`, error?.stack || error?.message || String(error));
  return ref;
}
