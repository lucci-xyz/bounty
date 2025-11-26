/**
 * Simple button comment to create a bounty.
 */
export function renderCreateButtonComment({
  attachUrl,
  ctaButtonUrl,
  brandSignature
}) {
  return `<a href="${attachUrl}" target="_blank" rel="noopener noreferrer"><img src="${ctaButtonUrl}" alt="Create a bounty" /></a>

${brandSignature}`;
}

