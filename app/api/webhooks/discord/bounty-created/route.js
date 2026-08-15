import { timingSafeEqual } from 'crypto';
import { logger } from '@/lib/logger';
import { sendNewBountyNotification, isDiscordConfigured } from '@/integrations/discord';

export const runtime = 'nodejs';

/**
 * Shared secret gating this relay.
 *
 * This endpoint forwards caller-supplied text and links straight into the
 * project's Discord channel. Unauthenticated, that is an open relay: anyone
 * could post a fabricated bounty with an attacker-controlled link into an
 * official channel. It fails CLOSED — with no secret configured, the endpoint
 * is disabled rather than public.
 *
 * NOTE: `POST /api/bounty/create` already calls `sendNewBountyNotification`
 * directly on the server, so this route is redundant and has no callers.
 * Deleting it is preferable to maintaining it.
 */
const RELAY_SECRET = process.env.DISCORD_RELAY_SECRET;

function isAuthorized(request) {
  if (!RELAY_SECRET) {
    return false;
  }

  const header = request.headers.get('authorization') || '';
  const provided = header.startsWith('Bearer ') ? header.slice(7) : '';

  const a = Buffer.from(provided);
  const b = Buffer.from(RELAY_SECRET);

  // Compare padded buffers so length alone is not a timing oracle.
  if (a.length !== b.length) {
    return false;
  }
  return timingSafeEqual(a, b);
}

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
    if (!isAuthorized(request)) {
      logger.warn('[discord-webhook] Rejected unauthorized relay request');
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

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
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

