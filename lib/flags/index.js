import { cache } from 'react';
import { get as getEdgeConfigValue } from '@vercel/edge-config';
import { flag, getProviderData } from 'flags/next';
import { logger } from '@/lib/logger';
import { identify, getIdentity } from './identify';

const EDGE_CONFIG_ITEM_KEY = 'flags';

const localOverrides = (() => {
  const raw =
    process.env.FLAGS_LOCAL_OVERRIDES ||
    process.env.NEXT_PUBLIC_FLAGS_LOCAL_OVERRIDES;

  if (!raw) {
    return {};
  }

  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') {
      return parsed;
    }
  } catch (error) {
    logger.warn('Failed to parse FLAGS_LOCAL_OVERRIDES. Falling back to defaults.', error);
  }

  return {};
})();

const readEdgeConfigFlags = cache(async () => {
  if (!process.env.EDGE_CONFIG) {
    return {};
  }

  try {
    const value = await getEdgeConfigValue(EDGE_CONFIG_ITEM_KEY);
    if (value && typeof value === 'object') {
      return value;
    }
    return {};
  } catch (error) {
    logger.warn('Edge Config flags not available; using defaults.', error);
    return {};
  }
});

function normalizeValue(value, fallback) {
  if (value === undefined || value === null) {
    return fallback;
  }

  if (typeof fallback === 'boolean') {
    if (typeof value === 'boolean') {
      return value;
    }
    if (typeof value === 'string') {
      if (value.toLowerCase() === 'true') {
        return true;
      }
      if (value.toLowerCase() === 'false') {
        return false;
      }
    }
    return fallback;
  }

  if (typeof fallback === 'number') {
    const nextValue = Number(value);
    return Number.isNaN(nextValue) ? fallback : nextValue;
  }

  if (typeof fallback === 'string') {
    return String(value);
  }

  return value;
}

async function resolveFlagValue(key, fallback) {
  if (Object.prototype.hasOwnProperty.call(localOverrides, key)) {
    return normalizeValue(localOverrides[key], fallback);
  }

  const edgeFlags = await readEdgeConfigFlags();
  if (edgeFlags && Object.prototype.hasOwnProperty.call(edgeFlags, key)) {
    return normalizeValue(edgeFlags[key], fallback);
  }

  return fallback;
}

function createFlagDeclaration(config) {
  const { name, transform, ...definition } = config;

  return flag({
    ...definition,
    identify,
    async decide({ entities }) {
      const identity = entities ?? (await identify());
      const resolved = await resolveFlagValue(definition.key, definition.defaultValue);
      return typeof transform === 'function' ? transform(resolved, identity) : resolved;
    }
  });
}

const allowlistFeature = createFlagDeclaration({
  name: 'allowlistFeature',
  key: 'allowlist-feature',
  description: 'Enables allowlist functionality for restricting bounty claims to specific wallet addresses.',
  defaultValue: false,
  options: [
    { label: 'Off', value: false },
    { label: 'On', value: true }
  ]
});

const refundFeature = createFlagDeclaration({
  name: 'refundFeature',
  key: 'refund-feature',
  description: 'Enables refund functionality for requesting refunds on expired bounties.',
  defaultValue: false,
  options: [
    { label: 'Off', value: false },
    { label: 'On', value: true }
  ]
});

const testnetNetworks = createFlagDeclaration({
  name: 'testnetNetworks',
  key: 'testnet-networks',
  description: 'Exposes Base Sepolia and Mezo Testnet networks in the UI.',
  defaultValue: true, // Enable testnets by default for staging
  options: [
    { label: 'Hidden', value: false },
    { label: 'Visible', value: true }
  ]
});

const multiTokenFeature = createFlagDeclaration({
  name: 'multiTokenFeature',
  key: 'multi-token',
  description: 'Enables token selection in the attach-bounty flow (USDC, EURC, etc.).',
  defaultValue: true, // Enable for testing
  options: [
    { label: 'Off', value: false },
    { label: 'On', value: true }
  ]
});

export const flagRegistry = {
  allowlistFeature,
  refundFeature,
  testnetNetworks,
  multiTokenFeature
};

export { allowlistFeature, refundFeature, testnetNetworks, multiTokenFeature };

export async function getFlags({ identity } = {}) {
  const resolvedIdentity = identity ?? (await getIdentity());
  const entries = await Promise.all(
    Object.entries(flagRegistry).map(async ([name, declaration]) => {
      const value = await declaration.run({
        identify: resolvedIdentity
      });
      return [name, value];
    })
  );
  return Object.fromEntries(entries);
}

export async function getFlagValue(name, options = {}) {
  const declaration = flagRegistry[name];
  if (!declaration) {
    throw new Error(`Unknown flag requested: ${name}`);
  }

  if (options.identity) {
    return declaration.run({ identify: options.identity });
  }

  return declaration();
}

export async function getFlagProviderData() {
  return getProviderData(flagRegistry);
}


