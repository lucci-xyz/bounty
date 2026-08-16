/**
 * Turning a picked calendar date into the escrow's deadline timestamp.
 *
 * Two things went wrong in the original inline version, and both silently cost
 * the user money or time they thought they had:
 *
 * 1. `new Date('2026-08-21')` parses as UTC midnight — the FIRST instant of
 *    that day. A sponsor in UTC-4 who picked Aug 21 got an escrow expiring
 *    Aug 20 at 8pm their time, before the day they chose had even started,
 *    while the form and the bot comment both said "Aug 21".
 *
 * 2. Any resulting timestamp in the past was rewritten to `now + 1 hour`
 *    rather than rejected. Tapping "Today" in the picker therefore funded a
 *    one-hour bounty while every surface still displayed today's date. Once
 *    that hour elapsed the contributor could no longer be paid.
 *
 * A date-only picker means "through the end of that day", so that is what a
 * picked date resolves to.
 */

/** A deadline must be at least this far ahead to be worth funding. */
export const MIN_DEADLINE_SECONDS = 3600;

/**
 * Resolve a picked date to the escrow deadline, in seconds.
 *
 * @param {string|Date} deadline A date-only string (`YYYY-MM-DD`), any parseable
 *   date string, or a Date.
 * @param {number} nowSeconds Current chain time, in seconds.
 * @returns {number} Deadline timestamp in seconds.
 * @throws {Error} If the date cannot be parsed, or resolves to less than
 *   MIN_DEADLINE_SECONDS ahead of `nowSeconds`. Never silently substitutes.
 */
export function resolveDeadline(deadline, nowSeconds) {
  if (deadline === null || deadline === undefined || deadline === '') {
    throw new Error('Please select a deadline.');
  }

  let timestampMs;

  if (deadline instanceof Date) {
    timestampMs = deadline.getTime();
  } else {
    const text = String(deadline).trim();
    // A bare `YYYY-MM-DD` means the whole of that day, so anchor it to the
    // day's final second rather than its first.
    const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
    timestampMs = dateOnly ? Date.parse(`${text}T23:59:59Z`) : Date.parse(text);
  }

  if (Number.isNaN(timestampMs)) {
    throw new Error('That deadline is not a valid date. Please pick one from the calendar.');
  }

  const timestamp = Math.floor(timestampMs / 1000);
  const earliest = nowSeconds + MIN_DEADLINE_SECONDS;

  if (timestamp < earliest) {
    throw new Error(
      'The deadline must be at least an hour from now. Pick a later date so contributors have time to work.'
    );
  }

  return timestamp;
}
