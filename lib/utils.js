import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * Combines class names using clsx and tailwind-merge
 * @param {...any} inputs - Class names to merge
 * @returns {string} Merged class names
 */
export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

/**
 * Returns network metadata including name and block explorer URL builder
 * @param {string} networkKey - Network identifier (BASE_SEPOLIA, MEZO_TESTNET, etc.)
 * @returns {Object} Network metadata with name and explorerTx function
 */
export function getNetworkMeta(networkKey) {
  if (networkKey === 'MEZO_TESTNET') {
    return {
      name: 'Mezo Testnet',
      explorerTx: (hash) => `https://explorer.test.mezo.org/tx/${hash}`,
    };
  }
  // Default to Base Sepolia
  return {
    name: 'Base Sepolia',
    explorerTx: (hash) => `https://sepolia.basescan.org/tx/${hash}`,
  };
}

/**
 * Builds block explorer URL for a transaction
 * @param {string} network - Network identifier
 * @param {string} txHash - Transaction hash
 * @returns {string|null} Block explorer URL or null if no hash provided
 */
export function getBlockExplorerUrl(network, txHash) {
  if (!txHash) return null;
  const meta = getNetworkMeta(network);
  return meta.explorerTx(txHash);
}

/**
 * Validates Ethereum address format
 * @param {string} address - Ethereum address to validate
 * @returns {boolean} True if valid address format
 */
export function isValidAddress(address) {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

/**
 * Truncates address for display
 * @param {string} address - Full Ethereum address
 * @param {number} startChars - Number of characters to show at start (default: 6)
 * @param {number} endChars - Number of characters to show at end (default: 4)
 * @returns {string} Truncated address (e.g., "0x1234...5678")
 */
export function truncateAddress(address, startChars = 6, endChars = 4) {
  if (!address) return '';
  if (address.length <= startChars + endChars) return address;
  return `${address.slice(0, startChars)}...${address.slice(-endChars)}`;
}

