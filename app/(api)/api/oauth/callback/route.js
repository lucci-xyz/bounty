import { logger } from '@/shared/lib/logger';
import './schema';
import { getSession } from '@/shared/lib/session';
import { CONFIG } from '@/shared/server/config';
import { NextResponse } from 'next/server';
import { getLinkHref } from '@/shared/config/links';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');
    
    const session = await getSession();
    
    if (error) {
      logger.error('OAuth error from GitHub:', error);
      return NextResponse.json({ error: `GitHub OAuth error: ${error}` }, { status: 400 });
    }
    
    if (!code) {
      logger.error('No authorization code received');
      return NextResponse.json({ error: 'No authorization code received' }, { status: 400 });
    }
    
    if (state !== session.oauthState) {
      logger.error('State mismatch - CSRF check failed');
      return NextResponse.json({ error: 'Invalid state parameter - CSRF check failed' }, { status: 400 });
    }
    
    const tokenResponse = await fetch(getLinkHref('github', 'oauthAccessToken'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        client_id: CONFIG.github.clientId,
        client_secret: CONFIG.github.clientSecret,
        code
      })
    });
    
    const tokenData = await tokenResponse.json();
    
    if (tokenData.error) {
      throw new Error(tokenData.error_description || 'OAuth token exchange failed');
    }
    
    const userResponse = await fetch(getLinkHref('github', 'apiUser'), {
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
        'Accept': 'application/json'
      }
    });
    
    const userData = await userResponse.json();
    
    session.githubId = userData.id;
    session.githubUsername = userData.login;
    session.githubAccessToken = tokenData.access_token;
    session.avatarUrl = userData.avatar_url;
    session.email = userData.email;
    
    const returnTo = session.oauthReturnTo || '/';
    delete session.oauthReturnTo;
    delete session.oauthState;
    await session.save();
    
    const url = new URL(returnTo, request.url);
    return NextResponse.redirect(url);
  } catch (error) {
    logger.error('OAuth error:', error.message);
    return NextResponse.json({ error: `Authentication failed: ${error.message}` }, { status: 500 });
  }
}

