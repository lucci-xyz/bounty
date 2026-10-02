import { logger } from '@/lib/logger';
import { getGitHubApp, initGitHubApp } from '@/integrations/github/client';
import { handleWebhook } from '@/integrations/github/webhooks';
import { verifyWebhookSignature } from '@/integrations/github/webhookAuth';

// Disable Next.js body parsing so we can access the raw body
export const runtime = 'nodejs';

export async function POST(request) {
  let githubApp;
  try {
    // Initialize GitHub App if not already initialized (serverless environment)
    try {
      githubApp = getGitHubApp();
    } catch (error) {
      githubApp = initGitHubApp();
    }
  } catch (error) {
    logger.error('Webhook: GitHub App unavailable:', error.message);
    return Response.json({ error: 'Webhook processing failed' }, { status: 500 });
  }

  const signature = request.headers.get('x-hub-signature-256');
  const event = request.headers.get('x-github-event');
  const delivery = request.headers.get('x-github-delivery');

  const rawBody = await request.text();

  // Authenticate BEFORE parsing or handling: this webhook triggers payouts.
  const verdict = await verifyWebhookSignature(
    (body, sig) => githubApp.webhooks.verify(body, sig),
    rawBody,
    signature
  );

  if (!verdict.ok) {
    logger.warn('Webhook rejected: invalid signature', {
      delivery,
      event,
      reason: verdict.reason
    });
    return Response.json({ error: 'Invalid signature' }, { status: 401 });
  }

  try {
    const body = JSON.parse(rawBody);
    await handleWebhook(event, body);
    return Response.json({ success: true });
  } catch (error) {
    logger.error('Webhook error:', error);

    if (error instanceof SyntaxError) {
      return Response.json({ error: 'Invalid JSON payload' }, { status: 400 });
    }

    // Do not echo internal error details from a publicly reachable endpoint.
    return Response.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}
