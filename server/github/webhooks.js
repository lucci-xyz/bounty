import { getGitHubApp, getOctokit, postIssueComment, updateComment, addLabels, getPR, extractClosedIssues } from './client.js';
import { bountyQueries, walletQueries, prClaimQueries } from '../db/index.js';
import { resolveBounty, formatUSDC } from '../blockchain/contract.js';
import { CONFIG } from '../config.js';

const COMMAND_PREFIX = '/bounty';
const ICON_BASE = `${CONFIG.frontendUrl.replace(/\/$/, '')}/icons`;
const ICONS = {
  funding: `${ICON_BASE}/funding.svg`,
  status: `${ICON_BASE}/status.svg`,
  wallet: `${ICON_BASE}/wallet.svg`,
  paid: `${ICON_BASE}/paid.svg`,
  alert: `${ICON_BASE}/alert.svg`
};

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
  
  const comment = `![Funding console](${ICONS.funding} "Launch funding console") **BountyPay · Funding Available**

[Launch funding console](${attachUrl})

- **Escrow:** USDC on Base
- **Payout:** Automatic on qualifying merge
- **Control:** Fund and manage in one place

Need a wallet primer? Visit ${CONFIG.frontendUrl}/link-wallet.`;

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
  const summary = `![Bounty status](${ICONS.status} "Bounty status") **BountyPay · Active Bounty**

| Detail | Value |
| --- | --- |
| Amount | ${amountFormatted} USDC (Base Sepolia) |
| Deadline | ${deadlineDate} |
| Status | Open |
| Transaction | [View on BaseScan](https://sepolia.basescan.org/tx/${txHash}) |

**Claim checklist**
- Close this issue with a PR (\`Closes #${issueNumber}\`)
- [Link wallet](${CONFIG.frontendUrl}/link-wallet) before merge
- Merge triggers automatic payout

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
    const comment = `![Wallet required](${ICONS.wallet} "Link wallet") **BountyPay · Action Needed**

This pull request is tied to an active bounty.

**Next step:** [Link wallet](${CONFIG.frontendUrl}/link-wallet) to receive the payout automatically once merged.`;

    await postIssueComment(octokit, owner, repo, pull_request.number, comment);
  } else {
    // User already has wallet linked
    const comment = `![Wallet linked](${ICONS.wallet} "Wallet linked") **BountyPay · All Set**

- Linked wallet: \`${walletMapping.wallet_address.slice(0, 6)}...${walletMapping.wallet_address.slice(-4)}\`
- Payout triggers automatically at merge`;

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
      const comment = `![Wallet required](${ICONS.wallet} "Link wallet") **BountyPay · Awaiting Wallet Link**

@${pull_request.user.login}, this bounty is ready to be released.

**Complete payout:** [Link wallet](${CONFIG.frontendUrl}/link-wallet)`;

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
      const successComment = `![Payout complete](${ICONS.paid} "Payout complete") **BountyPay · Payout Complete**

| Detail | Value |
| --- | --- |
| Recipient | @${pull_request.user.login} |
| Amount | ${amountFormatted} USDC |
| Transaction | [View on BaseScan](https://sepolia.basescan.org/tx/${result.txHash}) |

Appreciate the contribution.`;

      await postIssueComment(octokit, owner, repo, pull_request.number, successComment);
      
      // Update original issue's bounty comment
      if (bounty.pinned_comment_id) {
        const updatedSummary = `![Bounty status](${ICONS.status} "Bounty settled") **BountyPay · Bounty Settled**

| Detail | Value |
| --- | --- |
| Amount | ${amountFormatted} USDC (Base Sepolia) |
| Status | Resolved |
| Paid to | @${pull_request.user.login} |
| Transaction | [View on BaseScan](https://sepolia.basescan.org/tx/${result.txHash}) |

–– BountyPay`;

        await updateComment(octokit, owner, repo, bounty.pinned_comment_id, updatedSummary);
      }
    } else {
      // Payout failed
      const errorComment = `![Attention](${ICONS.alert} "Payout failed") **BountyPay · Payout Attempt Failed**

${result.error}

The bounty remains open—please alert a maintainer to retry.`;

      await postIssueComment(octokit, owner, repo, pull_request.number, errorComment);
      prClaimQueries.updateStatus(claim.id, 'failed');
    }
  }
}

/**
 * Handle `/bounty` commands issued via issue comments
 */
export async function handleIssueComment(payload) {
  const { action, comment, repository, issue, installation, sender } = payload;

  if (action !== 'created') {
    return; // only react to new comments
  }

  const authorIsBot = sender?.type === 'Bot' || sender?.login?.endsWith('[bot]');
  if (authorIsBot) {
    return;
  }

  const body = comment?.body?.trim() || '';
  if (!body.toLowerCase().startsWith(COMMAND_PREFIX)) {
    return; // not a bounty command
  }

  const octokit = await getOctokit(installation.id);
  const [owner, repo] = repository.full_name.split('/');
  const respond = (message) => postIssueComment(octokit, owner, repo, issue.number, message);

  const commandBody = body.slice(COMMAND_PREFIX.length).trim();
  if (!commandBody) {
    await respond(commandHelp());
    return;
  }

  const parts = commandBody.split(/\s+/);
  const verb = parts[0]?.toLowerCase();

  switch (verb) {
    case 'status': {
      await respond(buildStatusMessage(repository, issue));
      break;
    }
    case 'fund': {
      const amountInput = parts[1];
      const amountValid = amountInput && !Number.isNaN(Number(amountInput));
      if (!amountValid) {
        await respond(`![Attention](${ICONS.alert} "Command help") **BountyPay · Command Help**

Provide an amount, e.g. \`/bounty fund 150\`.`);
        break;
      }
      const link = buildFundingLink(repository, issue, installation, amountInput);
      await respond(`![Funding console](${ICONS.funding} "Funding console") **BountyPay · Funding Console**

[Fund ${amountInput} USDC](${link}) to open the secure workflow.`);
      break;
    }
    case 'assign': {
      const mention = parts[1];
      const username = mention?.startsWith('@') ? mention.slice(1) : mention;
      if (!username) {
        await respond(`![Attention](${ICONS.alert} "Command help") **BountyPay · Command Help**

Provide a GitHub username, e.g. \`/bounty assign @alice\`.`);
        break;
      }
      try {
        await octokit.rest.issues.addAssignees({
          owner,
          repo,
          issue_number: issue.number,
          assignees: [username]
        });
        await respond(`![Status](${ICONS.status} "Assignment updated") **BountyPay · Assignment Updated**

@${username} is now assigned to this issue.`);
      } catch (error) {
        console.error('Assign command error:', error);
        await respond(`![Attention](${ICONS.alert} "Assignment failed") **BountyPay · Assignment Failed**

${error.message || 'GitHub API request failed.'}`);
      }
      break;
    }
    default:
      await respond(commandHelp());
  }
}

function commandHelp() {
  return `![Status](${ICONS.status} "Commands") **BountyPay · Commands**

- \`/bounty fund <amount>\` · generate a secure funding link
- \`/bounty status\` · display bounty details
- \`/bounty assign @user\` · assign a contributor`;
}

function buildFundingLink(repository, issue, installation, amount) {
  const params = new URLSearchParams({
    repo: repository.full_name,
    issue: issue.number.toString(),
    repoId: repository.id.toString(),
    installationId: installation.id.toString(),
    amount: amount.toString()
  });
  return `${CONFIG.frontendUrl}/attach-bounty?${params.toString()}`;
}

function buildStatusMessage(repository, issue) {
  const bounties = bountyQueries.findByIssue(repository.id, issue.number);
  if (!bounties.length) {
    return `![Status](${ICONS.status} "Bounty status") **BountyPay · Status**

No active bounties are recorded for this issue.`;
  }

  const lines = bounties.map((bounty) => {
    const amount = formatUSDC(bounty.amount);
    const deadline = new Date(bounty.deadline * 1000).toISOString().split('T')[0];
    return `- **${amount} USDC** · deadline ${deadline} · status \`${bounty.status}\``;
  });

  return `![Status](${ICONS.status} "Bounty status") **BountyPay · Status**

${lines.join('\n')}`;
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

      case 'issue_comment':
        await handleIssueComment(payload);
        break;
        
      default:
        console.log(`Unhandled event: ${event}`);
    }
  } catch (error) {
    console.error(`Error handling webhook ${event}:`, error);
    throw error;
  }
}
