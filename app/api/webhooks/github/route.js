import { logger } from '@/lib/logger';
import { getGitHubApp, initGitHubApp } from '@/integrations/github/client';
import { handleWebhook } from '@/integrations/github/webhooks';

// Disable Next.js body parsing so we can access the raw body
export const runtime = 'nodejs';

// In-memory set for recent delivery IDs to prevent replay attacks.
// Entries expire after 1 hour. For multi-instance deployments, use a shared store.
const recentDeliveries = new Map();
const DELIVERY_TTL_MS = 60 * 60 * 1000;

function pruneDeliveries() {
  const cutoff = Date.now() - DELIVERY_TTL_MS;
  for (const [id, ts] of recentDeliveries) {
    if (ts < cutoff) recentDeliveries.delete(id);
  }
}

export async function POST(request) {
  try {
    // Initialize GitHub App if not already initialized (serverless environment)
    let githubApp;
    try {
      githubApp = getGitHubApp();
    } catch (error) {
      githubApp = initGitHubApp();
    }

    const signature = request.headers.get('x-hub-signature-256');
    const event = request.headers.get('x-github-event');
    const deliveryId = request.headers.get('x-github-delivery');

    const rawBody = await request.text();

    await githubApp.webhooks.verify(rawBody, signature);

    // Idempotency: reject duplicate deliveries to prevent replay attacks
    if (deliveryId) {
      pruneDeliveries();
      if (recentDeliveries.has(deliveryId)) {
        logger.info(`Duplicate webhook delivery skipped: ${deliveryId}`);
        return Response.json({ success: true, skipped: true });
      }
      recentDeliveries.set(deliveryId, Date.now());
    }

    // Parse the body for handling
    const body = JSON.parse(rawBody);

    // Handle the webhook
    await handleWebhook(event, body);

    return Response.json({ success: true });
  } catch (error) {
    logger.error('Webhook error:', error);

    if (error.message && error.message.includes('signature')) {
      return Response.json({ error: 'Invalid signature' }, { status: 401 });
    }

    // Return 200 on processing errors to prevent GitHub retry storms
    // The error is logged above for ops investigation
    logger.error('Webhook processing failed, returning 200 to prevent retries');
    return Response.json({ error: 'Webhook processing failed' }, { status: 200 });
  }
}

