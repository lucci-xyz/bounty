const JSON_CONTENT_TYPE = 'application/json';
const FORM_CONTENT_TYPE = 'application/x-www-form-urlencoded';

export function parseMarketplaceWebhookPayload(rawBody, contentType = JSON_CONTENT_TYPE) {
  if (typeof rawBody !== 'string' || rawBody.length === 0) {
    throw new SyntaxError('Webhook payload is empty');
  }

  const normalizedContentType = String(contentType || '').toLowerCase();
  if (normalizedContentType.includes(FORM_CONTENT_TYPE)) {
    const params = new URLSearchParams(rawBody);
    const payloadValue = params.get('payload');
    if (!payloadValue) {
      throw new SyntaxError('Form-encoded webhook is missing the payload field');
    }
    return JSON.parse(payloadValue);
  }

  return JSON.parse(rawBody);
}

function toOptionalInteger(value) {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const numberValue = Number(value);
  return Number.isInteger(numberValue) ? numberValue : null;
}

function toOptionalIdString(value) {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  if (typeof value === 'bigint') {
    return value.toString();
  }

  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      return null;
    }
    return Math.trunc(value).toString();
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    return /^\d+$/.test(trimmed) ? trimmed : null;
  }

  return null;
}

function toOptionalTimestamp(value) {
  if (!value) {
    return null;
  }

  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? null : parsed;
}

export function normalizeMarketplacePurchaseWebhook(payload, meta = {}) {
  const purchase = payload?.marketplace_purchase || {};
  const account = purchase.account || {};
  const plan = purchase.plan || {};
  const pendingChange =
    payload?.marketplace_pending_change ||
    account?.marketplace_pending_change ||
    null;
  const pendingPlan = pendingChange?.plan || {};

  return {
    githubEvent: meta.githubEvent || 'marketplace_purchase',
    deliveryId: meta.deliveryId || null,
    action: payload?.action || meta.action || null,
    accountId: toOptionalIdString(account.id),
    accountLogin: typeof account.login === 'string' ? account.login : null,
    accountType: typeof account.type === 'string' ? account.type : null,
    planId: toOptionalInteger(plan.id),
    planName: typeof plan.name === 'string' ? plan.name : null,
    billingCycle: typeof purchase.billing_cycle === 'string' ? purchase.billing_cycle : null,
    unitCount: toOptionalInteger(purchase.unit_count),
    onFreeTrial:
      typeof purchase.on_free_trial === 'boolean' ? purchase.on_free_trial : null,
    freeTrialEndsOn: toOptionalTimestamp(purchase.free_trial_ends_on),
    nextBillingDate: toOptionalTimestamp(purchase.next_billing_date),
    effectiveDate: toOptionalTimestamp(payload?.effective_date),
    pendingPlanId: toOptionalInteger(pendingPlan.id),
    pendingPlanName: typeof pendingPlan.name === 'string' ? pendingPlan.name : null,
    pendingEffectiveDate: toOptionalTimestamp(pendingChange?.effective_date),
    rawPayload: payload
  };
}

export function buildMarketplaceSubscriptionState(normalized, previousStatus = 'active') {
  const baseState = {
    ...(normalized.accountLogin ? { accountLogin: normalized.accountLogin } : {}),
    accountType: normalized.accountType,
    planId: normalized.planId,
    planName: normalized.planName,
    billingCycle: normalized.billingCycle,
    unitCount: normalized.unitCount,
    onFreeTrial: normalized.onFreeTrial,
    freeTrialEndsOn: normalized.freeTrialEndsOn,
    nextBillingDate: normalized.nextBillingDate,
    lastEvent: normalized.githubEvent,
    lastAction: normalized.action,
    lastDeliveryId: normalized.deliveryId,
    lastPayload: normalized.rawPayload
  };

  switch (normalized.action) {
    case 'purchased':
    case 'changed':
      return {
        ...baseState,
        status: 'active',
        pendingPlanId: null,
        pendingPlanName: null,
        pendingEffectiveDate: null,
        cancelledAt: null
      };
    case 'cancelled':
      return {
        ...baseState,
        status: 'cancelled',
        pendingPlanId: null,
        pendingPlanName: null,
        pendingEffectiveDate: null,
        cancelledAt:
          normalized.effectiveDate ||
          normalized.nextBillingDate ||
          Date.now()
      };
    case 'pending_change':
      return {
        ...baseState,
        status: previousStatus === 'cancelled' ? 'cancelled' : 'active',
        pendingPlanId: normalized.pendingPlanId,
        pendingPlanName: normalized.pendingPlanName,
        pendingEffectiveDate:
          normalized.pendingEffectiveDate || normalized.effectiveDate || null
      };
    case 'pending_change_cancelled':
      return {
        ...baseState,
        status: previousStatus === 'cancelled' ? 'cancelled' : 'active',
        pendingPlanId: null,
        pendingPlanName: null,
        pendingEffectiveDate: null
      };
    default:
      return baseState;
  }
}

export function hasMarketplaceAccess(subscription) {
  return subscription?.status === 'active';
}
