import { ethers } from 'ethers';

/**
 * Formats token amount from smallest unit to human-readable string
 * @param {string|number|bigint} amount - Amount in smallest token unit
 * @param {string} tokenSymbol - Token symbol (USDC, MUSD, etc.)
 * @returns {string} Formatted amount with 2 decimal places
 */
export function formatAmount(amount, tokenSymbol) {
  const decimals = tokenSymbol === 'USDC' ? 6 : (tokenSymbol === 'MUSD' ? 18 : 18);
  const value = Number(amount) / Math.pow(10, decimals);
  return value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

/**
 * Formats token amount using ethers.js for more precise handling
 * @param {string|bigint} amount - Amount in smallest token unit
 * @param {string} tokenSymbol - Token symbol
 * @returns {string} Formatted amount
 */
export function formatAmountByToken(amount, tokenSymbol) {
  const decimals = tokenSymbol === 'MUSD' ? 18 : 6;
  try {
    return ethers.formatUnits(amount, decimals);
  } catch {
    return amount;
  }
}

/**
 * Formats deadline timestamp as human-readable time remaining
 * @param {number|string|bigint} deadline - Unix timestamp in seconds
 * @returns {string} Human-readable time remaining (e.g., "3 days", "Expired")
 */
export function formatDeadline(deadline) {
  const date = new Date(Number(deadline) * 1000);
  const now = new Date();
  const diffTime = date - now;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays < 0) {
    return 'Expired';
  } else if (diffDays === 0) {
    return 'Today';
  } else if (diffDays === 1) {
    return '1 day';
  } else {
    return `${diffDays} days`;
  }
}

/**
 * Formats deadline with hours for shorter time spans
 * @param {number|string|bigint} deadline - Unix timestamp in seconds
 * @returns {string} Formatted time left (e.g., "3d", "2h", "Expired")
 */
export function formatTimeLeft(deadline) {
  if (!deadline) return '-';
  
  const deadlineMs = Number(deadline) * 1000;
  const now = Date.now();
  const diff = deadlineMs - now;
  
  if (diff < 0) return 'Expired';
  
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  
  if (days > 0) return `${days}d`;
  if (hours > 0) return `${hours}h`;
  return '< 1h';
}

/**
 * Formats star count with k suffix for thousands
 * @param {number} stars - Number of GitHub stars
 * @returns {string} Formatted star count (e.g., "1.2k", "543")
 */
export function formatStars(stars) {
  if (!stars && stars !== 0) {
    return '0';
  }
  if (stars >= 1000) {
    return `${(stars / 1000).toFixed(1)}k`;
  }
  return stars.toString();
}

/**
 * Returns color value for bounty status
 * @param {string} status - Bounty status (open, resolved, refunded, canceled)
 * @returns {string} CSS color variable or hex color
 */
export function getStatusColor(status) {
  switch (status) {
    case 'open':
      return 'var(--color-primary)';
    case 'resolved':
      return 'var(--color-success)';
    case 'refunded':
      return 'var(--color-warning)';
    case 'canceled':
      return 'var(--color-text-secondary)';
    default:
      return 'var(--color-text-secondary)';
  }
}

/**
 * Formats date timestamp to ISO date string
 * @param {number|bigint} timestamp - Unix timestamp in seconds
 * @returns {string} ISO date string (YYYY-MM-DD)
 */
export function formatDate(timestamp) {
  const date = new Date(Number(timestamp) * 1000);
  return date.toISOString().split('T')[0];
}

/**
 * Formats date timestamp to long human-readable format
 * @param {number|bigint} timestamp - Unix timestamp in seconds
 * @returns {string} Formatted date (e.g., "January 15, 2024")
 */
export function formatDateLong(timestamp) {
  return new Date(Number(timestamp) * 1000).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

