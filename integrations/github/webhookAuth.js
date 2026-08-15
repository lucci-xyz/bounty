/**
 * Webhook signature verification.
 *
 * This module exists as a standalone, dependency-free unit so the accept/reject
 * decision for inbound GitHub webhooks can be tested directly. That decision
 * gates the automated payout path, so it is the single most security-sensitive
 * branch in the application.
 *
 * The subtlety it guards against: `@octokit/webhooks`'s `verify()` RESOLVES to
 * a boolean. It does NOT throw when a signature is invalid — it throws only
 * when an argument is missing or malformed. Awaiting it without inspecting the
 * result accepts every forged request.
 */

/**
 * Decide whether an inbound webhook is authentic.
 *
 * Fails closed: any missing input, thrown error, or non-`true` result is a
 * rejection.
 *
 * @param {(rawBody: string, signature: string) => Promise<boolean>} verify
 *   Signature verifier already bound to the webhook secret
 *   (e.g. `githubApp.webhooks.verify`).
 * @param {string} rawBody   Exact raw request body used to compute the HMAC.
 * @param {string} signature Value of the `X-Hub-Signature-256` header.
 * @returns {Promise<{ ok: boolean, reason?: string }>}
 */
export async function verifyWebhookSignature(verify, rawBody, signature) {
  if (typeof verify !== 'function') {
    return { ok: false, reason: 'no_verifier' };
  }
  if (typeof rawBody !== 'string') {
    return { ok: false, reason: 'no_body' };
  }
  if (!signature) {
    return { ok: false, reason: 'no_signature' };
  }

  try {
    // Strict `=== true`: a truthy non-boolean must never be read as valid.
    const result = await verify(rawBody, signature);
    return result === true ? { ok: true } : { ok: false, reason: 'signature_mismatch' };
  } catch (error) {
    return { ok: false, reason: `verifier_error: ${error.message}` };
  }
}
