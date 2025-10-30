import express from 'express';
import { CONFIG } from '../config.js';

const router = express.Router();

/**
 * GET /oauth/github
 * Initiate GitHub OAuth flow
 */
router.get('/github', (req, res) => {
  const { returnTo } = req.query;
  
  console.log('🔐 GitHub OAuth initiated');
  console.log('   Return URL:', returnTo);
  console.log('   Session ID:', req.session.id);
  
  // Store return URL in session
  if (returnTo) {
    req.session.oauthReturnTo = returnTo;
  }
  
  const redirectUri = `${CONFIG.frontendUrl}/oauth/callback`;
  console.log('   Redirect URI:', redirectUri);
  
  const params = new URLSearchParams({
    client_id: CONFIG.github.clientId,
    redirect_uri: redirectUri,
    scope: 'read:user',
    state: req.session.id // CSRF protection
  });
  
  const authUrl = `https://github.com/login/oauth/authorize?${params}`;
  console.log('   Redirecting to GitHub...');
  
  res.redirect(authUrl);
});

/**
 * GET /oauth/callback
 * GitHub OAuth callback
 */
router.get('/callback', async (req, res) => {
  try {
    const { code, state, error } = req.query;
    
    console.log('🔐 GitHub OAuth callback received');
    console.log('   Code:', code ? 'present' : 'missing');
    console.log('   State:', state);
    console.log('   Error:', error);
    
    if (error) {
      console.error('❌ OAuth error from GitHub:', error);
      return res.status(400).send(`GitHub OAuth error: ${error}`);
    }
    
    if (!code) {
      console.error('❌ No authorization code received');
      return res.status(400).send('No authorization code received');
    }
    
    // Verify state for CSRF protection
    if (state !== req.session.id) {
      console.error('❌ State mismatch:', { expected: req.session.id, received: state });
      return res.status(400).send('Invalid state parameter - CSRF check failed');
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
    req.session.githubId = userData.id;
    req.session.githubUsername = userData.login;
    req.session.githubAccessToken = tokenData.access_token;
    
    // Redirect back to the originating page
    const returnTo = req.session.oauthReturnTo || '/link-wallet';
    delete req.session.oauthReturnTo;
    
    console.log('🔄 Redirecting to:', returnTo);
    res.redirect(returnTo);
  } catch (error) {
    console.error('❌ OAuth error:', error);
    res.status(500).send(`Authentication failed: ${error.message}`);
  }
});

/**
 * GET /oauth/user
 * Get current authenticated user
 */
router.get('/user', (req, res) => {
  console.log('👤 Checking authentication status');
  console.log('   Session ID:', req.session.id);
  console.log('   GitHub ID:', req.session.githubId);
  console.log('   GitHub Username:', req.session.githubUsername);
  
  if (!req.session.githubId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  
  res.json({
    githubId: req.session.githubId,
    githubUsername: req.session.githubUsername
  });
});

/**
 * POST /oauth/logout
 * Logout and clear session
 */
router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: 'Logout failed' });
    }
    res.json({ success: true });
  });
});

export default router;

