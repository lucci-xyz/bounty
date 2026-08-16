import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Webhooks } from '@octokit/webhooks';

import { verifyWebhookSignature } from '../integrations/github/webhookAuth.js';

const SECRET = 'test-webhook-secret';
const PAYLOAD = JSON.stringify({
  action: 'closed',
  pull_request: { merged: true, number: 1, user: { id: 1337 } }
});

/**
 * Regression guard for the inbound-webhook authentication that gates payouts.
 *
 * Root cause this pins down: `@octokit/webhooks`'s `verify()` resolves to a
 * boolean instead of throwing on a bad signature. Awaiting it without checking
 * the result made every forged webhook authentic, which let anyone drain an
 * open bounty by replaying a crafted "PR merged" event.
 */

test('octokit verify() RESOLVES false on a forged signature — it does not throw', async () => {
  const webhooks = new Webhooks({ secret: SECRET });
  const forged = `sha256=${'0'.repeat(64)}`;

  // If this ever starts throwing, the assumption baked into the route changed.
  const result = await webhooks.verify(PAYLOAD, forged);

  assert.equal(typeof result, 'boolean', 'verify() must return a boolean');
  assert.equal(result, false, 'a forged signature must verify as false');
});

test('rejects a forged signature', async () => {
  const webhooks = new Webhooks({ secret: SECRET });
  const forged = `sha256=${'0'.repeat(64)}`;

  const verdict = await verifyWebhookSignature(
    (body, sig) => webhooks.verify(body, sig),
    PAYLOAD,
    forged
  );

  assert.equal(verdict.ok, false);
  assert.equal(verdict.reason, 'signature_mismatch');
});

test('accepts a genuinely signed payload', async () => {
  const webhooks = new Webhooks({ secret: SECRET });
  const signature = await webhooks.sign(PAYLOAD);

  const verdict = await verifyWebhookSignature(
    (body, sig) => webhooks.verify(body, sig),
    PAYLOAD,
    signature
  );

  assert.equal(verdict.ok, true);
});

test('rejects a valid signature for a DIFFERENT body (tamper detection)', async () => {
  const webhooks = new Webhooks({ secret: SECRET });
  const signature = await webhooks.sign(PAYLOAD);
  const tampered = JSON.stringify({
    action: 'closed',
    pull_request: { merged: true, number: 1, user: { id: 66666 } }
  });

  const verdict = await verifyWebhookSignature(
    (body, sig) => webhooks.verify(body, sig),
    tampered,
    signature
  );

  assert.equal(verdict.ok, false);
});

test('rejects a signature made with the wrong secret', async () => {
  const attacker = new Webhooks({ secret: 'attacker-guessed-secret' });
  const server = new Webhooks({ secret: SECRET });
  const signature = await attacker.sign(PAYLOAD);

  const verdict = await verifyWebhookSignature(
    (body, sig) => server.verify(body, sig),
    PAYLOAD,
    signature
  );

  assert.equal(verdict.ok, false);
});

test('rejects a missing signature header without throwing', async () => {
  const webhooks = new Webhooks({ secret: SECRET });

  for (const missing of [undefined, null, '']) {
    const verdict = await verifyWebhookSignature(
      (body, sig) => webhooks.verify(body, sig),
      PAYLOAD,
      missing
    );
    assert.equal(verdict.ok, false, `signature ${JSON.stringify(missing)} must be rejected`);
    assert.equal(verdict.reason, 'no_signature');
  }
});

test('fails closed when the verifier throws', async () => {
  const verdict = await verifyWebhookSignature(
    async () => {
      throw new TypeError('secret, eventPayload & signature required');
    },
    PAYLOAD,
    'sha256=whatever'
  );

  assert.equal(verdict.ok, false);
  assert.match(verdict.reason, /verifier_error/);
});

test('fails closed on a truthy non-boolean verifier result', async () => {
  const verdict = await verifyWebhookSignature(
    async () => 'yes',
    PAYLOAD,
    'sha256=whatever'
  );

  assert.equal(verdict.ok, false, 'only a strict `true` may be accepted');
});

test('rejects a non-string body', async () => {
  const verdict = await verifyWebhookSignature(
    async () => true,
    { action: 'closed' },
    'sha256=whatever'
  );

  assert.equal(verdict.ok, false);
  assert.equal(verdict.reason, 'no_body');
});
