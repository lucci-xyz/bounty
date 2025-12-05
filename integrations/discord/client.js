import { logger } from '@/lib/logger';

/**
 * Get the Discord webhook URL for new bounty notifications
 * @returns {string|undefined}
 */
export function getDiscordWebhookUrl() {
  return process.env.DISCORD_NEW_BOUNTY_WEBHOOK_URL;
}

/**
 * Check if Discord webhook is configured
 * @returns {boolean}
 */
export function isDiscordConfigured() {
  const url = getDiscordWebhookUrl();
  return Boolean(url && url.startsWith('https://discord.com/api/webhooks/'));
}

/**
 * Format a bounty into a Discord embed
 * @param {Object} bounty - Bounty data
 * @param {string} bounty.title - Issue/bounty title
 * @param {string} bounty.repoName - Repository name (owner/repo)
 * @param {string} bounty.issueUrl - URL to the GitHub issue
 * @param {string} bounty.amount - Bounty amount (claimer receives, formatted)
 * @param {string} [bounty.platformFee] - Platform fee (formatted)
 * @param {string} [bounty.total] - Total sponsor payment (formatted)
 * @param {number} [bounty.feeBps] - Platform fee in bps
 * @param {string} bounty.tokenSymbol - Token symbol (USDC, MUSD)
 * @param {string} bounty.network - Network name
 * @param {string} bounty.deadline - Deadline date string
 * @param {string} bounty.createdByGithubUsername - Sponsor's GitHub username
 * @returns {Object} Discord embed object
 */
export function formatBountyEmbed(bounty) {
  const {
    title,
    repoName,
    issueUrl,
    amount,
    platformFee,
    total,
    feeBps,
    tokenSymbol,
    network,
    deadline,
    createdByGithubUsername
  } = bounty;

  let deadlineDisplay = deadline;
  try {
    const deadlineDate = new Date(deadline);
    if (!isNaN(deadlineDate.getTime())) {
      deadlineDisplay = deadlineDate.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    }
  } catch {
    // keep original string
  }

  const feePercentDisplay = Number.isFinite(Number(feeBps))
    ? (Number(feeBps) / 100).toFixed(2)
    : '1.00';

  const descriptionLines = [
    `**${title || 'New bounty available'}**`,
    '',
    `💵 **Reward (claimer receives):** ${amount} ${tokenSymbol}`,
    platformFee
      ? `🏷️ **Platform fee (${feePercentDisplay}%):** ${platformFee} ${tokenSymbol} (paid by sponsor)`
      : null,
    total ? `💰 **Total you pay:** ${total} ${tokenSymbol}` : null,
    `🌐 **Network:** ${network}`,
    `📁 **Repository:** [${repoName}](https://github.com/${repoName})`,
    `📅 **Deadline:** ${deadlineDisplay}`,
    `👤 **Sponsor:** [@${createdByGithubUsername}](https://github.com/${createdByGithubUsername})`,
    '',
    `[View issue](${issueUrl})`
  ].filter(Boolean);

  return {
    embeds: [
      {
        title: '💰 New Bounty Posted!',
        description: descriptionLines.join('\n'),
        color: 0x0ea5e9, // calmer blue accent
        url: issueUrl,
        timestamp: new Date().toISOString(),
        footer: {
          text: 'BountyPay'
        }
      }
    ]
  };
}

/**
 * Send a message to the Discord new bounty webhook
 * @param {Object} payload - Discord webhook payload (with embeds or content)
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function sendDiscordMessage(payload) {
  const webhookUrl = getDiscordWebhookUrl();

  if (!webhookUrl) {
    logger.warn('[discord] Webhook URL not configured');
    return { success: false, error: 'Discord webhook not configured' };
  }

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error('[discord] Webhook failed:', {
        status: response.status,
        statusText: response.statusText,
        body: errorText
      });
      return {
        success: false,
        error: `Discord API error: ${response.status} ${response.statusText}`
      };
    }

    logger.info('[discord] Bounty notification sent successfully');
    return { success: true };
  } catch (error) {
    logger.error('[discord] Failed to send webhook:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Send a new bounty notification to Discord
 * @param {Object} bounty - Bounty data
 * @param {string} bounty.title - Issue/bounty title
 * @param {string} bounty.repoName - Repository name (owner/repo)
 * @param {string} bounty.issueUrl - URL to the GitHub issue
 * @param {string} bounty.amount - Bounty amount (formatted)
 * @param {string} bounty.tokenSymbol - Token symbol (USDC, MUSD)
 * @param {string} bounty.network - Network name
 * @param {string} bounty.deadline - Deadline date string
 * @param {string} bounty.createdByGithubUsername - Sponsor's GitHub username
 * @returns {Promise<{success: boolean, skipped?: boolean, error?: string}>}
 */
export async function sendNewBountyNotification(bounty) {
  if (!isDiscordConfigured()) {
    logger.warn('[discord] Webhook not configured. Skipping bounty notification');
    return { success: false, skipped: true, reason: 'not_configured' };
  }

  const embed = formatBountyEmbed(bounty);
  return sendDiscordMessage(embed);
}

