/**
 * Capitalizes the first letter of a string.
 * @param {string} str - The string to capitalize
 * @returns {string} The string with the first letter capitalized
 */
export function capitalizeFirst(str) {
  if (!str || str.length === 0) return str;
  return str.charAt(0).toUpperCase() + str.slice(1);
}

