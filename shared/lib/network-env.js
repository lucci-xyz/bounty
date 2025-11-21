import { getDefaultAliasForGroup, getAlias } from '../../config/chain-registry.js';

export const NETWORK_ENV_COOKIE = 'network_env';

/**
 * Get the selected network group from cookies
 * @param {Object} cookies - Next.js cookies object
 * @returns {string} 'mainnet' or 'testnet'
 */
export function getSelectedGroupFromCookies(cookies) {
  const cookieValue = cookies.get(NETWORK_ENV_COOKIE)?.value;
  
  // Default to testnet if not set (safer for development)
  if (!cookieValue || !['mainnet', 'testnet'].includes(cookieValue)) {
    return 'testnet';
  }
  
  return cookieValue;
}

/**
 * Get the active network alias based on cookies
 * @param {Object} cookies - Next.js cookies object
 * @returns {string} Network alias (e.g., 'BASE_MAINNET')
 */
export function getActiveAliasFromCookies(cookies) {
  const group = getSelectedGroupFromCookies(cookies);
  return getDefaultAliasForGroup(group);
}

/**
 * Get the active network configuration based on cookies
 * @param {Object} cookies - Next.js cookies object
 * @returns {Object} Network configuration
 */
export function getActiveNetworkFromCookies(cookies) {
  const alias = getActiveAliasFromCookies(cookies);
  return { alias, ...getAlias(alias) };
}

