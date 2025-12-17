import { logger } from '@/lib/logger';
import { CONFIG } from '@/server/config';
import { createHmac } from 'crypto';

// Disable Next.js body parsing so we can access the raw body
export const runtime = 'nodejs';

/**
 * Verifies the HMAC signature of a GitHub Marketplace webhook.
 * 
 * @param {string} rawBody - The raw request body
 * @param {string} signature - The X-Hub-Signature-256 header value
 * @param {string} secret - The webhook secret
 * @returns {boolean} True if signature is valid
 */
function verifySignature(rawBody, signature, secret) {
  if (!signature || !secret) {
    return false;
  }

  // GitHub sends signature as "sha256=<hash>"
  const [algorithm, receivedHash] = signature.split('=');
  
  if (algorithm !== 'sha256') {
    return false;
  }

  // Compute HMAC
  const hmac = createHmac('sha256', secret);
  hmac.update(rawBody, 'utf8');
  const computedHash = hmac.digest('hex');

  // Constant-time comparison to prevent timing attacks
  return timingSafeEqual(
    Buffer.from(receivedHash, 'hex'),
    Buffer.from(computedHash, 'hex')
  );
}

/**
 * Timing-safe comparison of two buffers.
 * Returns true if buffers are equal.
 */
function timingSafeEqual(a, b) {
  if (a.length !== b.length) {
    return false;
  }
  
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a[i] ^ b[i];
  }
  
  return result === 0;
}

/**
 * POST /api/webhooks/marketplace
 * 
 * Receives GitHub Marketplace webhook events (marketplace_purchase).
 * Verifies HMAC signature and logs events for plan changes.
 */
export async function POST(request) {
  try {
    const signature = request.headers.get('x-hub-signature-256');
    const event = request.headers.get('x-github-event');
    const delivery = request.headers.get('x-github-delivery');

    // Read raw body for signature verification
    const rawBody = await request.text();

    // Verify signature
    const secret = CONFIG.github.marketplaceWebhookSecret;
    if (!secret) {
      logger.error('[MARKETPLACE_WEBHOOK] GITHUB_MARKETPLACE_WEBHOOK_SECRET not configured');
      return Response.json(
        { error: 'Webhook secret not configured' },
        { status: 500 }
      );
    }

    const isValid = verifySignature(rawBody, signature, secret);
    if (!isValid) {
      logger.warn('[MARKETPLACE_WEBHOOK] Invalid signature', {
        delivery,
        event,
        signatureProvided: !!signature
      });
      return Response.json(
        { error: 'Invalid signature' },
        { status: 401 }
      );
    }

    // Parse body
    const payload = JSON.parse(rawBody);

    // Log the event
    logger.info('[MARKETPLACE_WEBHOOK] Received event', {
      event,
      delivery,
      action: payload.action,
      account: payload.marketplace_purchase?.account?.login,
      plan: payload.marketplace_purchase?.plan?.name,
      effectiveDate: payload.effective_date
    });

    // Handle marketplace_purchase events
    if (event === 'marketplace_purchase') {
      const { action, marketplace_purchase } = payload;
      const account = marketplace_purchase?.account?.login;
      const plan = marketplace_purchase?.plan?.name;

      switch (action) {
        case 'purchased':
          logger.info(`[MARKETPLACE_WEBHOOK] New purchase: ${account} → ${plan}`);
          // TODO: Handle new purchase (e.g., activate features, send email)
          break;

        case 'changed':
          logger.info(`[MARKETPLACE_WEBHOOK] Plan changed: ${account} → ${plan}`);
          // TODO: Handle plan change (e.g., update features, send email)
          break;

        case 'cancelled':
          logger.info(`[MARKETPLACE_WEBHOOK] Plan cancelled: ${account}`);
          // TODO: Handle cancellation (e.g., deactivate features, send email)
          break;

        case 'pending_change':
          logger.info(`[MARKETPLACE_WEBHOOK] Pending change: ${account} → ${plan}`);
          // TODO: Handle pending change (if needed)
          break;

        case 'pending_change_cancelled':
          logger.info(`[MARKETPLACE_WEBHOOK] Pending change cancelled: ${account}`);
          // TODO: Handle cancellation of pending change
          break;

        default:
          logger.warn(`[MARKETPLACE_WEBHOOK] Unknown action: ${action}`);
      }
    } else {
      logger.warn(`[MARKETPLACE_WEBHOOK] Unexpected event type: ${event}`);
    }

    // Always return 200 to acknowledge receipt
    return Response.json({ success: true });
  } catch (error) {
    logger.error('[MARKETPLACE_WEBHOOK] Error processing webhook:', error);

    if (error instanceof SyntaxError) {
      return Response.json(
        { error: 'Invalid JSON payload' },
        { status: 400 }
      );
    }

    return Response.json(
      { error: 'Webhook processing failed', details: error.message },
      { status: 500 }
    );
  }
}

