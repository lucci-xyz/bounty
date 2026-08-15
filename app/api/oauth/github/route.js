import { getSession } from '@/lib/session';
import { CONFIG } from '@/server/config';
import { NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { getLinkHref } from '@/config/links';
import { resolveSameOriginRedirect } from '@/lib/safeRedirect';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const returnTo = searchParams.get('returnTo');
  
  const session = await getSession();
  
  // Store only a destination on our own origin. Rejecting here means a hostile
  // returnTo never reaches the session, so the callback cannot be tricked even
  // if its own check were later weakened.
  if (returnTo) {
    const safe = resolveSameOriginRedirect(returnTo, CONFIG.frontendUrl || request.url);
    if (safe) {
      session.oauthReturnTo = safe;
    }
  }
  
  const redirectUri = `${CONFIG.frontendUrl}/api/oauth/callback`;
  
  // Generate cryptographically secure random state for CSRF protection
  const state = randomBytes(32).toString('hex');
  
  const params = new URLSearchParams({
    client_id: CONFIG.github.clientId,
    redirect_uri: redirectUri,
    scope: 'read:user',
    state: state
  });
  
  session.oauthState = state;
  await session.save();
  
  const authUrl = getLinkHref('github', 'oauthAuthorize', { queryString: params.toString() });
  
  return NextResponse.redirect(authUrl);
}

