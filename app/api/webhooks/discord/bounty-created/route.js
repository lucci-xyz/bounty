import { logger } from '@/lib/logger';
import { sendNewBountyNotification, isDiscordConfigured } from '@/integrations/discord';

/**
 * Webhook endpoint for posting new bounty notifications to Discord
 * 
 * POST /api/webhooks/discord/bounty-created
 * 
 * Body:
 * {
 *   title: string,           // Issue/bounty title
 *   repoName: string,        // Repository name (owner/repo)
 *   issueUrl: string,        // URL to the GitHub issue
 *   amount: string,          // Bounty amount (formatted, e.g. "100")
 *   tokenSymbol: string,     // Token symbol (USDC, MUSD)
 *   network: string,         // Network name (e.g. "Base", "Mezo Testnet")
 *   deadline: string,        // Deadline date string (ISO or human-readable)
 *   createdByGithubUsername: string  // Sponsor's GitHub username
 * }
 */
export async function POST(request) {
  try {
    // Check if Discord is configured
    if (!isDiscordConfigured()) {
      logger.warn('[discord-webhook] Discord webhook not configured');
      return Response.json(
        { error: 'Discord webhook not configured' },
        { status: 503 }
      );
    }

    // Parse request body
    const body = await request.json();

    const {
      title,
      repoName,
      issueUrl,
      amount,
      tokenSymbol,
      network,
      deadline,
      createdByGithubUsername
    } = body;

    // Validate required fields
    const requiredFields = {
      title,
      repoName,
      issueUrl,
      amount,
      tokenSymbol,
      network,
      deadline,
      createdByGithubUsername
    };

    const missingFields = Object.entries(requiredFields)
      .filter(([, value]) => !value)
      .map(([key]) => key);

    if (missingFields.length > 0) {
      logger.warn('[discord-webhook] Missing required fields:', missingFields);
      return Response.json(
        { error: `Missing required fields: ${missingFields.join(', ')}` },
        { status: 400 }
      );
    }

    // Send notification to Discord
    const result = await sendNewBountyNotification({
      title,
      repoName,
      issueUrl,
      amount,
      tokenSymbol,
      network,
      deadline,
      createdByGithubUsername
    });

    if (!result.success) {
      logger.error('[discord-webhook] Failed to send Discord notification:', result.error);
      return Response.json(
        { error: result.error || 'Failed to send Discord notification' },
        { status: 502 }
      );
    }

    logger.info('[discord-webhook] Successfully sent bounty notification to Discord', {
      repoName,
      amount,
      tokenSymbol
    });

    return Response.json({ success: true });
  } catch (error) {
    logger.error('[discord-webhook] Error processing request:', error);
    return Response.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

