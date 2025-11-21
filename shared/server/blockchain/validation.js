import { isAddress, getAddress } from 'ethers';

/**
 * Validation utilities for blockchain interactions
 */

/**
 * Validate and normalize an Ethereum address
 * @param {string} address - Address to validate
 * @param {string} fieldName - Name of the field for error messages
 * @returns {string} Normalized checksum address
 * @throws {Error} If address is invalid
 */
export function validateAddress(address, fieldName = 'address') {
  if (!address || typeof address !== 'string') {
    throw new Error(`${fieldName} is required and must be a string`);
  }
  
  if (!isAddress(address)) {
    throw new Error(`Invalid ${fieldName} format`);
  }
  
  // Return checksum address
  return getAddress(address);
}

/**
 * Validate a bytes32 value (64 hex characters with 0x prefix)
 * @param {string} value - Value to validate
 * @param {string} fieldName - Name of the field for error messages
 * @returns {string} Validated value
 * @throws {Error} If value is invalid
 */
export function validateBytes32(value, fieldName = 'bytes32') {
  if (!value || typeof value !== 'string') {
    throw new Error(`${fieldName} is required and must be a string`);
  }
  
  if (!/^0x[a-fA-F0-9]{64}$/.test(value)) {
    throw new Error(`Invalid ${fieldName} format - must be 0x followed by 64 hex characters`);
  }
  
  return value.toLowerCase();
}

/**
 * Validate a positive number
 * @param {number|string} value - Value to validate
 * @param {string} fieldName - Name of the field for error messages
 * @returns {number} Validated number
 * @throws {Error} If value is invalid
 */
export function validatePositiveNumber(value, fieldName = 'value') {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  
  if (isNaN(num) || num <= 0) {
    throw new Error(`${fieldName} must be a positive number`);
  }
  
  return num;
}

/**
 * Validate an amount string (for token amounts)
 * @param {string} amount - Amount to validate
 * @param {string} fieldName - Name of the field for error messages
 * @returns {string} Validated amount
 * @throws {Error} If amount is invalid
 */
export function validateAmount(amount, fieldName = 'amount') {
  if (!amount || typeof amount !== 'string') {
    throw new Error(`${fieldName} is required and must be a string`);
  }
  
  // Check if it's a valid number string
  if (!/^\d+$/.test(amount)) {
    throw new Error(`Invalid ${fieldName} format - must contain only digits`);
  }
  
  // Check if it's greater than 0
  if (BigInt(amount) <= 0n) {
    throw new Error(`${fieldName} must be greater than 0`);
  }
  
  return amount;
}

/**
 * Validate a network alias
 * @param {string} alias - Network alias to validate
 * @returns {string} Validated network alias
 * @throws {Error} If alias is invalid
 */
export function validateAlias(alias) {
  // Import REGISTRY - safe to use direct import since validation happens after config build
  const { REGISTRY } = require('../../../config/chain-registry.js');
  const validAliases = Object.keys(REGISTRY);
  
  if (!alias || !validAliases.includes(alias)) {
    throw new Error(`Invalid network alias. Must be one of: ${validAliases.join(', ')}`);
  }
  
  return alias;
}

/**
 * Validate a network name (legacy compatibility)
 * @param {string} network - Network name to validate
 * @returns {string} Validated network name
 * @throws {Error} If network is invalid
 * @deprecated Use validateAlias instead
 */
export function validateNetwork(network) {
  return validateAlias(network);
}

/**
 * Validate a transaction hash
 * @param {string} txHash - Transaction hash to validate
 * @returns {string} Validated transaction hash
 * @throws {Error} If txHash is invalid
 */
export function validateTxHash(txHash) {
  if (!txHash || typeof txHash !== 'string') {
    throw new Error('Transaction hash is required and must be a string');
  }
  
  if (!/^0x[a-fA-F0-9]{64}$/.test(txHash)) {
    throw new Error('Invalid transaction hash format');
  }
  
  return txHash.toLowerCase();
}
