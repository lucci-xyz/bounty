import { getIronSession } from 'iron-session';
import { cookies } from 'next/headers';
import { getLinkHref } from '@/config/links';

const LOCAL_FRONTEND = getLinkHref('app', 'frontendLocal');

function resolveCookieDomain() {
  if (process.env.COOKIE_DOMAIN) return process.env.COOKIE_DOMAIN;
  const url = process.env.FRONTEND_URL;
  if (!url || url === LOCAL_FRONTEND) return undefined;
  try {
    return new URL(url).hostname;
  } catch {
    return undefined;
  }
}

const domain = resolveCookieDomain();

export const sessionOptions = {
  password: process.env.SESSION_SECRET,
  cookieName: 'bountypay_session',
  cookieOptions: {
    secure:
      process.env.NODE_ENV === 'production' ||
      (process.env.FRONTEND_URL || '').startsWith('https://'),
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 24 * 60 * 60,
    ...(domain && { domain })
  }
};

export async function getSession() {
  return getIronSession(await cookies(), sessionOptions);
}
