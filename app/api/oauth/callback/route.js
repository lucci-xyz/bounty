import { getSession } from '@/lib/session';
import { CONFIG } from '@/server/config';
import { redirect } from 'next/navigation';
import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');
    
    const session = await getSession();
    
    console.log('🔐 GitHub OAuth callback received');
    console.log('   Code:', code ? 'present' : 'missing');
    console.log('   State:', state);
    console.log('   Error:', error);
    
    if (error) {
      console.error('❌ OAuth error from GitHub:', error);
      return NextResponse.json({ error: `GitHub OAuth error: ${error}` }, { status: 400 });
    }
    
    if (!code) {
      console.error('❌ No authorization code received');
      return NextResponse.json({ error: 'No authorization code received' }, { status: 400 });
    }
    
    // Verify state for CSRF protection
    if (state !== session.oauthState) {
      console.error('❌ State mismatch:', { expected: session.oauthState, received: state });
      return NextResponse.json({ error: 'Invalid state parameter - CSRF check failed' }, { status: 400 });
    }
    
    console.log('✅ State verified, exchanging code for token...');
    
    // Exchange code for access token
    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
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
    console.log('Token response:', tokenData.error ? `Error: ${tokenData.error}` : 'Success');
    
    if (tokenData.error) {
      throw new Error(tokenData.error_description || 'OAuth token exchange failed');
    }
    
    // Get user info
    console.log('🔍 Fetching user info...');
    const userResponse = await fetch('https://api.github.com/user', {
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
        'Accept': 'application/json'
      }
    });
    
    const userData = await userResponse.json();
    console.log('✅ User authenticated:', userData.login);
    
    // Store in session
    session.githubId = userData.id;
    session.githubUsername = userData.login;
    session.githubAccessToken = tokenData.access_token;
    
    // Get return URL and clean up
    const returnTo = session.oauthReturnTo || '/link-wallet';
    delete session.oauthReturnTo;
    delete session.oauthState;
    await session.save();
    
    console.log('🔄 Redirecting to:', returnTo);
    return redirect(returnTo);
  } catch (error) {
    console.error('❌ OAuth error:', error);
    return NextResponse.json({ error: `Authentication failed: ${error.message}` }, { status: 500 });
  }
}

