import './schema';
import { getSession } from '@/shared/lib/session';
import { CONFIG } from '@/shared/server/config';
import { NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { getLinkHref } from '@/shared/config/links';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const returnTo = searchParams.get('returnTo');
  
  const session = await getSession();
  
  if (returnTo) {
    session.oauthReturnTo = returnTo;
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

