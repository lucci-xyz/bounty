/**
 * HTML escaping for externally-controlled text in outbound email.
 *
 * Email templates interpolate values that originate with untrusted third
 * parties — a pull request title, a GitHub username, an issue title. Those
 * arrive verbatim from the webhook payload and land inside a DKIM-signed
 * message from the product's own domain, which is precisely what makes markup
 * injected there convincing: an attacker-chosen PR title can close the
 * surrounding element and add their own link or styling to an email the
 * recipient has every reason to trust.
 */

const HTML_ESCAPES = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;'
};

/**
 * Escape HTML-significant characters.
 *
 * Ampersand is replaced first via the single character-class pass, so already
 * escaped entities are not double-processed out of order.
 *
 * @param {unknown} value Any value; non-strings are coerced, null/undefined
 *   become an empty string.
 * @returns {string} Text safe to interpolate into an HTML attribute or body.
 */
export function escapeHtml(value) {
  if (value === null || value === undefined) return '';
  return String(value).replace(/[&<>"']/g, (char) => HTML_ESCAPES[char]);
}
