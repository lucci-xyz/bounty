export function renderBountyButtonComment({ attachUrl, ctaButtonUrl, brandSignature }) {
  return `<a href="${attachUrl}" target="_blank" rel="noopener noreferrer"><img src="${ctaButtonUrl}" alt="Create a bounty button" /></a>

${brandSignature}`;
}

