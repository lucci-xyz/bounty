import { getIronSession } from 'iron-session';
import { cookies } from 'next/headers';
import { getLinkHref } from '@/shared/config/links';

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

export const sessionOptions = {
  password: process.env.SESSION_SECRET,
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

