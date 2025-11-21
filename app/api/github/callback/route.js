import './schema';
import { CONFIG } from '@/server/config';

export const runtime = 'nodejs';

export async function POST(request) {
  try {
    const target = CONFIG.envTarget === 'stage' ? CONFIG.stageCallbackUrl : CONFIG.prodCallbackUrl;
    if (!target) {
      return Response.json({ error: 'Callback target not configured' }, { status: 500 });
    }

    // Get raw body to preserve signatures
    const rawBody = await request.arrayBuffer();
    
    // Forward headers, but avoid overriding Host
    const headers = {};
    request.headers.forEach((value, key) => {
      if (key.toLowerCase() !== 'host') {
        headers[key] = value;
      }
    });

    const upstream = await fetch(target, {
      method: 'POST',
      headers,
      body: rawBody,
    });

    const text = await upstream.text();
    return new Response(text, { status: upstream.status });
  } catch (error) {
    console.error('Callback proxy error:', error.message);
    return Response.json({ error: 'Upstream callback proxy failed' }, { status: 502 });
  }
}

