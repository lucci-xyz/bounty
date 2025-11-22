import { createSIWEMessageText } from '@/shared/server/auth/siwe';

function validatePayload(payload) {
  if (!payload || typeof payload !== 'object') {
    throw new Error('Invalid request payload');
  }

  const { address, nonce } = payload;

  if (!address || typeof address !== 'string') {
    throw new Error('Wallet address is required');
  }

  if (!nonce || typeof nonce !== 'string') {
    throw new Error('Nonce is required');
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    validatePayload(body);

    const {
      address,
      nonce,
      chainId,
      domain,
      uri,
      statement,
      resources
    } = body;

    const message = createSIWEMessageText(address, nonce, chainId, {
      domain,
      uri,
      statement,
      resources
    });

    return Response.json({ message });
  } catch (error) {
    return Response.json(
      { error: error.message || 'Failed to build SIWE message' },
      { status: 400 }
    );
  }
}


