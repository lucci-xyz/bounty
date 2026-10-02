import { logger } from '@/lib/logger';
import { newErrorRef } from '@/lib/errorRef';
import { createSIWEMessageText } from '@/server/auth/siwe';

/**
 * @returns {string|null} Why the payload is invalid, or null when it is valid.
 */
function validatePayload(payload) {
  if (!payload || typeof payload !== 'object') {
    return 'Invalid request payload';
  }

  const { address, nonce } = payload;

  if (!address || typeof address !== 'string') {
    return 'Wallet address is required';
  }

  if (!nonce || typeof nonce !== 'string') {
    return 'Nonce is required';
  }

  return null;
}

export async function POST(request) {
  try {
    const body = await request.json();
    const invalid = validatePayload(body);
    if (invalid) {
      return Response.json({ error: invalid }, { status: 400 });
    }

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
    const ref = newErrorRef();
    logger.warn(`[${ref}] Failed to build SIWE message:`, error);
    return Response.json(
      { error: 'Failed to build SIWE message', ref },
      { status: 400 }
    );
  }
}

