import { getGitHubApp, initGitHubApp } from '@/server/github/client';
import { handleWebhook } from '@/server/github/webhooks';

// Disable Next.js body parsing so we can access the raw body
export const runtime = 'nodejs';

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
    const id = request.headers.get('x-github-delivery');

    console.log(`\n📬 Webhook received: ${event} (${id})`);
    console.log(`   Signature present: ${signature ? 'yes' : 'NO'}`);
    console.log(`   Webhook secret configured: ${githubApp.webhooks.secret ? 'yes' : 'NO'}`);

    // Get raw body for signature verification
    const rawBody = await request.text();
    console.log(`   Body length: ${rawBody.length} bytes`);
    
    // Verify webhook signature using raw body
    await githubApp.webhooks.verify(rawBody, signature);

    console.log(`   ✅ Signature verified`);

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

