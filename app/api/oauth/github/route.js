import { getSession } from '@/lib/session';
import { CONFIG } from '@/server/config';
import { NextResponse } from 'next/server';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const returnTo = searchParams.get('returnTo');
  
  const session = await getSession();
  
  if (returnTo) {
    session.oauthReturnTo = returnTo;
  }
  
  const redirectUri = `${CONFIG.frontendUrl}/api/oauth/callback`;
  
  const params = new URLSearchParams({
    client_id: CONFIG.github.clientId,
    redirect_uri: redirectUri,
    scope: 'read:user',
    state: Math.random().toString(36).substring(7)
  });
  
  session.oauthState = params.get('state');
  await session.save();
  
  const authUrl = `https://github.com/login/oauth/authorize?${params}`;
  
  return NextResponse.redirect(authUrl);
}

