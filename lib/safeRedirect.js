/**
 * Same-origin redirect validation.
 *
 * The OAuth flow carries a caller-supplied `returnTo` through to a post-login
 * redirect. Resolving that value with `new URL(returnTo, base)` silently honours
 * an absolute URL, so an unvalidated value is an open redirect: an attacker can
 * send a victim through the real, correctly-branded login and land them on a
 * look-alike site afterwards.
 *
 * Legitimate callers pass either a relative path (`/app/account`) or an absolute
 * URL on the app's own origin (`window.location.href`), so both are accepted and
 * everything else is refused.
 */

/**
 * Resolve `returnTo` against `baseUrl`, returning null unless it stays on the
 * same origin.
 *
 * Rejects protocol-relative values (`//evil.com`), non-HTTP schemes
 * (`javascript:`, `data:`), and any absolute URL pointing elsewhere.
 *
 * @param {string|null|undefined} returnTo Caller-supplied destination.
 * @param {string} baseUrl Absolute URL defining the trusted origin.
 * @returns {string|null} A safe absolute URL string, or null if unsafe.
 */
export function resolveSameOriginRedirect(returnTo, baseUrl) {
  if (!returnTo || typeof returnTo !== 'string') return null;

  let base;
  try {
    base = new URL(baseUrl);
  } catch {
    return null;
  }

  // `//evil.com/x` is protocol-relative and resolves off-origin. Reject before
  // parsing so it can never be mistaken for a path.
  if (returnTo.startsWith('//')) return null;

  let target;
  try {
    target = new URL(returnTo, base);
  } catch {
    return null;
  }

  if (target.protocol !== 'http:' && target.protocol !== 'https:') return null;
  if (target.origin !== base.origin) return null;

  return target.toString();
}

/**
 * Same as `resolveSameOriginRedirect`, falling back to a known-safe path.
 *
 * @param {string|null|undefined} returnTo
 * @param {string} baseUrl
 * @param {string} [fallback='/']
 * @returns {string} Always a safe absolute URL string.
 */
export function safeRedirectOrDefault(returnTo, baseUrl, fallback = '/') {
  return resolveSameOriginRedirect(returnTo, baseUrl) ?? new URL(fallback, baseUrl).toString();
}
