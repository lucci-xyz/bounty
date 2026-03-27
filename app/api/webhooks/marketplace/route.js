import { logger } from '@/lib/logger';
import { CONFIG } from '@/server/config';
import { createHmac, timingSafeEqual } from 'crypto';
import { marketplaceQueries } from '@/server/db/prisma';
import {
  normalizeMarketplacePurchaseWebhook,
  parseMarketplaceWebhookPayload
} from '@/server/marketplace/github';

// Disable Next.js body parsing so we can access the raw body
export const runtime = 'nodejs';

/**
 * Verifies the HMAC signature of a GitHub Marketplace webhook.
 * Uses Node.js built-in timingSafeEqual for constant-time comparison.
 */
function verifySignature(rawBody, signature, secret) {
  if (!signature || !secret) {
    return false;
  }

  const [algorithm, receivedHash] = signature.split('=');
  if (algorithm !== 'sha256' || !receivedHash) {
    return false;
  }

  const hmac = createHmac('sha256', secret);
  hmac.update(rawBody, 'utf8');
  const computedHash = hmac.digest('hex');

  // Use Node.js built-in timing-safe comparison
  try {
    return timingSafeEqual(
      Buffer.from(receivedHash, 'hex'),
      Buffer.from(computedHash, 'hex')
    );
  } catch {
    return false;
  }
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
    const contentType = request.headers.get('content-type') || 'application/json';

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

    // Parse body after verifying the signature against the original bytes.
    const payload = parseMarketplaceWebhookPayload(rawBody, contentType);

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
      const normalized = normalizeMarketplacePurchaseWebhook(payload, {
        githubEvent: event,
        deliveryId: delivery
      });

      const action = normalized.action;
      if (!normalized.accountId && !normalized.accountLogin) {
        logger.warn('[MARKETPLACE_WEBHOOK] Skipping purchase event without account identity', {
          delivery,
          action
        });
        return Response.json({ success: true, skipped: true });
      }

      const result = await marketplaceQueries.applyPurchaseWebhook(normalized);

      logger.info('[MARKETPLACE_WEBHOOK] Subscription state updated', {
        delivery,
        action,
        duplicate: result.duplicate,
        account: normalized.accountLogin,
        plan: normalized.planName,
        status: result.subscription?.status,
        pendingPlan: result.subscription?.pendingPlanName || null
      });
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
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}
