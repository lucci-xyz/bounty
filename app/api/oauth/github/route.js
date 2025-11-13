import { getSession } from '@/lib/session';
import { CONFIG } from '@/server/config';
import { redirect } from 'next/navigation';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const returnTo = searchParams.get('returnTo');
  
  const session = await getSession();
  
  console.log('🔐 GitHub OAuth initiated');
  console.log('   Return URL:', returnTo);
  
  // Store return URL in session
  if (returnTo) {
    session.oauthReturnTo = returnTo;
    await session.save();
  }
  
  const redirectUri = `${CONFIG.frontendUrl}/api/oauth/callback`;
  console.log('   Redirect URI:', redirectUri);
  
  const params = new URLSearchParams({
    client_id: CONFIG.github.clientId,
    redirect_uri: redirectUri,
    scope: 'read:user',
    state: Math.random().toString(36).substring(7) // CSRF protection
  });
  
  // Store state in session for verification
  session.oauthState = params.get('state');
  await session.save();
  
  const authUrl = `https://github.com/login/oauth/authorize?${params}`;
  console.log('   Redirecting to GitHub...');
  
  return redirect(authUrl);
}

