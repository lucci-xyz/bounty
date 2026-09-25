import { formatAmount } from './format/amount.js';

/**
 * Canonical PR claim statuses.
 *
 * A claim links one pull request to one bounty. Its status records how far the
 * payout got:
 *
 * - `pending`         PR is open (or merged but not yet processed). Not payable
 *                     by the contributor: the merge gate has not run.
 * - `pending_wallet`  PR merged and closes the issue, but the contributor had no
 *                     wallet linked. Payable as soon as one is.
 * - `failed`          PR merged and closes the issue, but the transfer did not
 *                     happen (RPC error, allowlist, bad address, window closed).
 * - `paid`            Funds transferred. Terminal.
 *
 * `pending_wallet` used to be a dead end. The bot told the contributor to link a
 * wallet and "comment on this issue", but no comment handler existed, the retry
 * endpoint accepted only `failed`, and the dashboard labelled the claim "Paid".
 * The bounty sat in escrow until the sponsor could refund it.
 */

export const CLAIM_STATUS = {
  PENDING: 'pending',
  PENDING_WALLET: 'pending_wallet',
  FAILED: 'failed',
  PAID: 'paid'
};

/** Older rows and some UI code spell a paid claim `resolved`. */
const LEGACY_PAID = 'resolved';

/**
 * Merged, unpaid claims the contributor may settle themselves: by linking a
 * wallet or pressing retry. Never includes `pending`, which has not passed the
 * merge gate.
 */
export const SETTLEABLE_CLAIM_STATUSES = new Set([CLAIM_STATUS.PENDING_WALLET, CLAIM_STATUS.FAILED]);

/** Every status the merge webhook may settle from. */
export const UNPAID_CLAIM_STATUSES = new Set([
  CLAIM_STATUS.PENDING,
  CLAIM_STATUS.PENDING_WALLET,
  CLAIM_STATUS.FAILED
]);

/**
 * @param {string} status
 * @returns {boolean} Whether the claim's funds have already been transferred.
 */
export function isPaidClaim(status) {
  return status === CLAIM_STATUS.PAID || status === LEGACY_PAID;
}

/**
 * @param {string} status
 * @returns {boolean} Whether the contributor may trigger settlement of this claim.
 */
export function isSettleableClaim(status) {
  return SETTLEABLE_CLAIM_STATUSES.has(status);
}

/**
 * How a claim status reads on the contributor's dashboard.
 *
 * An unrecognised status reads "Unknown", never "Paid": telling someone they
 * were paid when they were not is the one mistake this must not make.
 *
 * @param {string} status
 * @returns {{ label: string, tone: 'success'|'pending'|'warning'|'error'|'muted', actionLabel: string|null }}
 *   `actionLabel` is set only for statuses the contributor can settle.
 */
export function describeClaimStatus(status) {
  if (isPaidClaim(status)) return { label: 'Paid', tone: 'success', actionLabel: null };

  switch (status) {
    case CLAIM_STATUS.PENDING:
      return { label: 'Pending', tone: 'pending', actionLabel: null };
    case CLAIM_STATUS.PENDING_WALLET:
      return { label: 'Unclaimed', tone: 'warning', actionLabel: 'Collect payout' };
    case CLAIM_STATUS.FAILED:
      return { label: 'Failed', tone: 'error', actionLabel: 'Retry payout' };
    default:
      return { label: 'Unknown', tone: 'muted', actionLabel: null };
  }
}

/**
 * One sentence for the contributor after linking a wallet settled their
 * waiting payouts. `null` when there is nothing to say.
 *
 * @param {Array<{outcome: string, repoFullName?: string, issueNumber?: number,
 *   amount?: string, tokenSymbol?: string}>} payouts Public settlement summaries
 *   from `POST /api/wallet/link`.
 * @returns {string|null}
 */
export function describeSettledPayouts(payouts) {
  const list = Array.isArray(payouts) ? payouts : [];
  const ref = (p) => `${p.repoFullName}#${p.issueNumber}`;

  const paid = list.filter((p) => p.outcome === 'paid');
  const closed = list.filter((p) => p.outcome === 'window_closed');
  const unsent = list.filter((p) => !['paid', 'window_closed', 'skipped'].includes(p.outcome));

  const sentences = [];

  if (paid.length > 0) {
    const items = paid.map((p) => `${formatAmount(p.amount, p.tokenSymbol)} ${p.tokenSymbol} for ${ref(p)}`);
    sentences.push(
      paid.length === 1 ? `Paid ${items[0]}.` : `Paid ${paid.length} bounties: ${items.join(', ')}.`
    );
  }

  if (closed.length > 0) {
    sentences.push(`The payout window for ${closed.map(ref).join(', ')} has closed.`);
  }

  if (unsent.length > 0) {
    sentences.push(
      unsent.length === 1
        ? '1 payout could not be sent; retry it from your dashboard.'
        : `${unsent.length} payouts could not be sent; retry them from your dashboard.`
    );
  }

  return sentences.length > 0 ? sentences.join(' ') : null;
}
