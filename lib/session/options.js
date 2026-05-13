import { getLinkHref } from '../../config/links.js';
import { logger } from '../logger/index.js';

const LOCAL_FRONTEND = getLinkHref('app', 'frontendLocal');

export function resolveCookieDomain(env = process.env) {
  if (env.COOKIE_DOMAIN) return env.COOKIE_DOMAIN;
  const url = env.FRONTEND_URL;
  if (!url || url === LOCAL_FRONTEND) return undefined;
  try {
    return new URL(url).hostname;
  } catch (e) {
    logger.warn('Failed to parse FRONTEND_URL for cookie domain:', e);
    return undefined;
  }
}

export function buildCookieOptions(env = process.env) {
  const domain = resolveCookieDomain(env);
  return {
    secure: env.NODE_ENV === 'production' || (env.FRONTEND_URL || '').startsWith('https://'),
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 24 * 60 * 60,
    ...(domain && { domain })
  };
}

export function buildSessionOptions(env = process.env) {
  return {
    password: env.SESSION_SECRET,
    cookieName: 'bountypay_session',
    cookieOptions: buildCookieOptions(env)
  };
}
