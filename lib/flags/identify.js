'use server';

import { cache } from 'react';
import { getSession } from '@/lib/session';
import { logger } from '@/lib/logger';

const resolveIdentity = cache(async () => {
  try {
    const session = await getSession();
    if (!session || !session.githubId) {
      return {
        key: 'anonymous',
        anonymous: true
      };
    }

    return {
      key: String(session.githubId),
      githubId: session.githubId,
      githubUsername: session.githubUsername,
      email: session.email,
      betaAccess: Boolean(session.betaAccess),
      anonymous: false
    };
  } catch (error) {
    // During static generation, cookies() isn't available, which is expected
    // Only log warnings for unexpected errors
    const isStaticGenerationError = error?.message?.includes('Dynamic server usage') || 
                                    error?.message?.includes('cookies');
    if (!isStaticGenerationError) {
      logger.warn('Flag identity resolution failed; defaulting to anonymous context.', error);
    }
    return {
      key: 'anonymous',
      anonymous: true
    };
  }
});

/**
 * Primary identify helper consumed by the Flags SDK.
 * Even though the SDK passes request metadata, we currently
 * only depend on the signed session for user context.
 */
export async function identify() {
  return resolveIdentity();
}

/**
 * Convenience helper for callers that already know they
 * need the identity object but do not want to depend on
 * the SDK-specific signature.
 */
export async function getIdentity() {
  return resolveIdentity();
}


