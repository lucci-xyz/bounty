/**
 * Active-bounty filtering shared by the server-rendered feed and the client
 * refresh path.
 *
 * Both paths must produce identical lists from the same rows, or the page
 * visibly churns after hydration and crawlers see different content than
 * users. Dependency-free except lib/status (which itself has no imports),
 * so node --test can import this directly — the same pattern as
 * integrations/github/webhookAuth.js.
 */
import { TERMINAL_STATUSES } from './status/index.js';

/**
 * Keeps bounties that are neither terminal nor past deadline.
 *
 * @param {Array<object>|null|undefined} list
 * @param {number} [nowSeconds] - clock injection for tests
 * @returns {Array<object>}
 */
export function filterActiveBounties(list, nowSeconds = Math.floor(Date.now() / 1000)) {
  if (!Array.isArray(list)) return [];
  return list.filter((bounty) => {
    if (!bounty) return false;
    const status = typeof bounty.status === 'string' ? bounty.status.toLowerCase() : '';
    if (TERMINAL_STATUSES.has(status)) {
      return false;
    }
    const deadline = Number(bounty.deadline);
    if (Number.isFinite(deadline)) {
      return deadline > nowSeconds;
    }
    return true;
  });
}
