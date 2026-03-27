import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildMarketplaceSubscriptionState,
  hasMarketplaceAccess,
  normalizeMarketplacePurchaseWebhook,
  parseMarketplaceWebhookPayload
} from '../server/marketplace/github.js';

test('parseMarketplaceWebhookPayload parses application/json payloads', () => {
  const payload = parseMarketplaceWebhookPayload('{"action":"purchased"}', 'application/json');
  assert.deepEqual(payload, { action: 'purchased' });
});

test('parseMarketplaceWebhookPayload parses form-encoded payloads', () => {
  const encoded = `payload=${encodeURIComponent('{"action":"changed"}')}`;
  const payload = parseMarketplaceWebhookPayload(encoded, 'application/x-www-form-urlencoded; charset=utf-8');
  assert.deepEqual(payload, { action: 'changed' });
});

test('normalizeMarketplacePurchaseWebhook extracts stable account and plan fields', () => {
  const normalized = normalizeMarketplacePurchaseWebhook(
    {
      action: 'purchased',
      effective_date: '2026-03-27T00:00:00Z',
      marketplace_purchase: {
        billing_cycle: 'monthly',
        unit_count: 5,
        on_free_trial: true,
        free_trial_ends_on: '2026-04-03T00:00:00Z',
        next_billing_date: '2026-04-27T00:00:00Z',
        account: {
          id: 42,
          login: 'octo-org',
          type: 'Organization'
        },
        plan: {
          id: 7,
          name: 'Pro'
        }
      },
      marketplace_pending_change: {
        effective_date: '2026-05-01T00:00:00Z',
        plan: {
          id: 9,
          name: 'Business'
        }
      }
    },
    {
      githubEvent: 'marketplace_purchase',
      deliveryId: 'delivery-1'
    }
  );

  assert.equal(normalized.deliveryId, 'delivery-1');
  assert.equal(normalized.accountId, '42');
  assert.equal(normalized.accountLogin, 'octo-org');
  assert.equal(normalized.planId, 7);
  assert.equal(normalized.planName, 'Pro');
  assert.equal(normalized.pendingPlanId, 9);
  assert.equal(normalized.pendingPlanName, 'Business');
  assert.equal(normalized.billingCycle, 'monthly');
  assert.equal(normalized.unitCount, 5);
  assert.equal(normalized.onFreeTrial, true);
});

test('buildMarketplaceSubscriptionState activates purchased subscriptions', () => {
  const state = buildMarketplaceSubscriptionState({
    action: 'purchased',
    githubEvent: 'marketplace_purchase',
    deliveryId: 'delivery-1',
    accountLogin: 'octo-org',
    planId: 7,
    planName: 'Pro',
    billingCycle: 'monthly',
    unitCount: 5,
    onFreeTrial: false,
    freeTrialEndsOn: null,
    nextBillingDate: null,
    rawPayload: {}
  });

  assert.equal(state.status, 'active');
  assert.equal(state.pendingPlanId, null);
  assert.equal(state.pendingPlanName, null);
  assert.equal(state.cancelledAt, null);
});

test('buildMarketplaceSubscriptionState records pending changes without removing access', () => {
  const state = buildMarketplaceSubscriptionState({
    action: 'pending_change',
    githubEvent: 'marketplace_purchase',
    deliveryId: 'delivery-2',
    accountLogin: 'octo-org',
    planId: 7,
    planName: 'Pro',
    pendingPlanId: 9,
    pendingPlanName: 'Business',
    pendingEffectiveDate: 1_774_972_800_000,
    rawPayload: {}
  });

  assert.equal(state.status, 'active');
  assert.equal(state.pendingPlanId, 9);
  assert.equal(state.pendingPlanName, 'Business');
  assert.equal(state.pendingEffectiveDate, 1_774_972_800_000);
});

test('buildMarketplaceSubscriptionState cancels access when cancellation takes effect', () => {
  const state = buildMarketplaceSubscriptionState({
    action: 'cancelled',
    githubEvent: 'marketplace_purchase',
    deliveryId: 'delivery-3',
    accountLogin: 'octo-org',
    planId: 7,
    planName: 'Pro',
    nextBillingDate: 1_774_972_800_000,
    rawPayload: {}
  });

  assert.equal(state.status, 'cancelled');
  assert.equal(state.cancelledAt, 1_774_972_800_000);
  assert.equal(hasMarketplaceAccess(state), false);
});

test('hasMarketplaceAccess only grants access for active subscriptions', () => {
  assert.equal(hasMarketplaceAccess({ status: 'active' }), true);
  assert.equal(hasMarketplaceAccess({ status: 'cancelled' }), false);
});
