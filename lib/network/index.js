import { getDefaultAliasForGroup, getAlias } from '../../config/chain-registry.js';

export const NETWORK_ENV_COOKIE = 'network_env';

export function getSelectedGroupFromCookies(cookies) {
  const cookieValue = cookies.get(NETWORK_ENV_COOKIE)?.value;
  if (!cookieValue || !['mainnet', 'testnet'].includes(cookieValue)) {
    return 'mainnet';
  }
  return cookieValue;
}

export function getActiveAliasFromCookies(cookies) {
  const group = getSelectedGroupFromCookies(cookies);
  return getDefaultAliasForGroup(group);
}

export function getActiveNetworkFromCookies(cookies) {
  const alias = getActiveAliasFromCookies(cookies);
  return { alias, ...getAlias(alias) };
}

