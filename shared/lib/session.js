import { getIronSession } from 'iron-session';
import { cookies } from 'next/headers';

// Determine if we're in a secure environment (HTTPS)
const isSecure = () => {
  // Always secure in production, regardless of FRONTEND_URL configuration
  if (process.env.NODE_ENV === 'production') {
    return true;
  }
  
  // In development, check if FRONTEND_URL starts with https
  const frontendUrl = process.env.FRONTEND_URL || '';
  return frontendUrl.startsWith('https://');
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
    // Use 'strict' for stronger CSRF protection
    // Note: This may affect OAuth flows if not handled properly
    sameSite: 'lax', // Keep as 'lax' for OAuth compatibility, could be 'strict' for higher security
    path: '/',
    maxAge: 24 * 60 * 60, // 24 hours
    ...(getCookieDomain() ? { domain: getCookieDomain() } : {}),
  },
};

// Session configuration is automatically applied

export async function getSession() {
  const cookieStore = await cookies();
  return getIronSession(cookieStore, sessionOptions);
}

