import { getIronSession } from 'iron-session';
import { cookies } from 'next/headers';
import { getLinkHref } from '@/config/links';

const HTTPS_PREFIX = getLinkHref('protocols', 'https');
const LOCAL_FRONTEND = getLinkHref('app', 'frontendLocal');

const isSecure = () => {
  if (process.env.NODE_ENV === 'production') {
    return true;
  }
  const frontendUrl = process.env.FRONTEND_URL || '';
  return frontendUrl.startsWith(HTTPS_PREFIX);
};

const getCookieDomain = () => {
  if (process.env.COOKIE_DOMAIN) {
    return process.env.COOKIE_DOMAIN;
  }
  const frontendUrl = process.env.FRONTEND_URL;
  if (frontendUrl && frontendUrl !== LOCAL_FRONTEND) {
    try {
      const url = new URL(frontendUrl);
      return url.hostname;
    } catch (e) {
      console.warn('Failed to parse FRONTEND_URL for cookie domain:', e);
    }
  }
  return undefined;
};

const sessionSecret = process.env.SESSION_SECRET;
if (sessionSecret && sessionSecret.length < 32) {
  console.error('SESSION_SECRET must be at least 32 characters for secure encryption');
}

export const sessionOptions = {
  password: sessionSecret,
  cookieName: 'bountypay_session',
  cookieOptions: {
    secure: isSecure(),
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 24 * 60 * 60,
    ...(getCookieDomain() ? { domain: getCookieDomain() } : {})
  }
};

export async function getSession() {
  const cookieStore = await cookies();
  return getIronSession(cookieStore, sessionOptions);
}

