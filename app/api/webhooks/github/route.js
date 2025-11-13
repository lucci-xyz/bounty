import { getGitHubApp } from '@/server/github/client';
import { handleWebhook } from '@/server/github/webhooks';

// Disable Next.js body parsing so we can access the raw body
export const runtime = 'nodejs';

export async function POST(request) {
  try {
    const githubApp = getGitHubApp();
    const signature = request.headers.get('x-hub-signature-256');
    const event = request.headers.get('x-github-event');
    const id = request.headers.get('x-github-delivery');

    // Get raw body for signature verification
    const rawBody = await request.text();
    
    // Verify webhook signature using raw body
    await githubApp.webhooks.verify(rawBody, signature);

    console.log(`\n📬 Webhook received: ${event} (${id})`);

    // Parse the body for handling
    const body = JSON.parse(rawBody);
    
    // Handle the webhook
    await handleWebhook(event, body);

    return Response.json({ success: true });
  } catch (error) {
    console.error('Webhook error:', error);
    
    if (error.message && error.message.includes('signature')) {
      return Response.json({ error: 'Invalid signature' }, { status: 401 });
    }
    
    return Response.json({ error: 'Webhook processing failed', details: error.message }, { status: 500 });
  }
}

