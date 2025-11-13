import { getIronSession } from 'iron-session';
import { cookies } from 'next/headers';

// Determine if we're in a secure environment (HTTPS)
const isSecure = () => {
  // Check if FRONTEND_URL starts with https OR if we're in production
  const frontendUrl = process.env.FRONTEND_URL || '';
  return frontendUrl.startsWith('https://') || process.env.NODE_ENV === 'production';
};

// Get cookie domain from environment or extract from FRONTEND_URL
const getCookieDomain = () => {
  // Explicit COOKIE_DOMAIN takes precedence
  if (process.env.COOKIE_DOMAIN) {
    return process.env.COOKIE_DOMAIN;
  }
  
  // Extract domain from FRONTEND_URL for staging/production
  const frontendUrl = process.env.FRONTEND_URL;
  if (frontendUrl && frontendUrl !== 'http://localhost:3000') {
    try {
      const url = new URL(frontendUrl);
      // Return the hostname (e.g., bounty-stage.luccilabs.xyz)
      return url.hostname;
    } catch (e) {
      console.warn('Failed to parse FRONTEND_URL for cookie domain:', e);
    }
  }
  
  // For localhost, don't set domain (defaults to current host)
  return undefined;
};

export const sessionOptions = {
  password: process.env.SESSION_SECRET,
  cookieName: 'bountypay_session',
  cookieOptions: {
    secure: isSecure(),
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 24 * 60 * 60, // 24 hours
    ...(getCookieDomain() ? { domain: getCookieDomain() } : {}),
  },
};

// Log session configuration on startup (only in non-production for debugging)
if (process.env.NODE_ENV !== 'production') {
  console.log('🍪 Session cookie configuration:', {
    domain: getCookieDomain() || 'default (current host)',
    secure: isSecure(),
    sameSite: 'lax',
    httpOnly: true,
  });
}

export async function getSession() {
  const cookieStore = await cookies();
  return getIronSession(cookieStore, sessionOptions);
}

