import { SiweMessage } from 'siwe';

export const DEFAULT_SIWE_STATEMENT = 'Link your wallet to receive BountyPay payments.';
export const DEFAULT_SIWE_VERSION = '1';

function resolveDomain(domain) {
  if (domain) return domain;
  if (typeof window !== 'undefined' && window.location?.host) {
    return window.location.host;
  }
  throw new Error('SIWE message domain is required');
}

function resolveUri(uri) {
  if (uri) return uri;
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin;
  }
  throw new Error('SIWE message URI is required');
}

export function buildSiweMessagePayload({
  address,
  nonce,
  chainId,
  domain,
  uri,
  statement = DEFAULT_SIWE_STATEMENT,
  version = DEFAULT_SIWE_VERSION,
  issuedAt = new Date().toISOString(),
  resources
}) {
  if (!address) {
    throw new Error('SIWE message requires an address');
  }
  if (!nonce) {
    throw new Error('SIWE message requires a nonce');
  }
  if (!chainId) {
    throw new Error('SIWE message requires a chainId');
  }

  const payload = {
    domain: resolveDomain(domain),
    address,
    statement,
    uri: resolveUri(uri),
    version,
    chainId,
    nonce,
    issuedAt
  };

  if (resources?.length) {
    payload.resources = resources;
  }

  return payload;
}

export function createSiweMessageInstance(options) {
  return new SiweMessage(buildSiweMessagePayload(options));
}

export function createSiweMessageText(options) {
  return createSiweMessageInstance(options).prepareMessage();
}

