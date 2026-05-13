import { getIronSession } from 'iron-session';
import { cookies } from 'next/headers';
import { buildSessionOptions } from './options.js';

export { resolveCookieDomain, buildCookieOptions, buildSessionOptions } from './options.js';

export const sessionOptions = buildSessionOptions();

export async function getSession() {
  return getIronSession(await cookies(), sessionOptions);
}
