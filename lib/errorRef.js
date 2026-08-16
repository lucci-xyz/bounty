import { randomUUID } from 'crypto';

/**
 * Correlation ids for errors that are surfaced publicly.
 *
 * Several failure paths post to a GitHub issue or pull request — a permanent,
 * world-readable location. Sending raw error text there leaks whatever the
 * throwing layer happened to include: a stack trace exposing server paths and
 * module layout, or an ethers/provider message carrying the configured RPC URL
 * (which commonly embeds an API key) and the upstream response body.
 *
 * Publish an opaque reference instead, and keep the detail in the server log
 * under that same reference so an operator can still join the two.
 */

/**
 * Create a short, unique reference for one error occurrence.
 *
 * @returns {string} e.g. "err_9f3a1c2b"
 */
export function newErrorRef() {
  return `err_${randomUUID().replace(/-/g, '').slice(0, 8)}`;
}

/**
 * Public-safe error text carrying only the reference.
 *
 * @param {string} ref Reference from `newErrorRef`.
 * @returns {string} Text safe to publish in a comment or email.
 */
export function publicErrorMessage(ref) {
  return `Internal error (ref: ${ref}). The team has the details in the server logs.`;
}
