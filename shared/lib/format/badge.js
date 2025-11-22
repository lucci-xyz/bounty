export function encodeBadgeSegment(text) {
  return encodeURIComponent(text).replace(/-/g, '--');
}

export function buildShieldsBadge({
  baseUrl,
  label,
  value,
  color = '0B9ED9',
  labelColor = '111827',
  style = 'for-the-badge',
  extraQuery = ''
}) {
  if (!baseUrl) {
    throw new Error('buildShieldsBadge requires a baseUrl');
  }
  const queryParts = [`style=${style}`, `labelColor=${labelColor}`];
  if (extraQuery) {
    queryParts.push(extraQuery);
  }
  const query = queryParts.join('&');
  return `![${label} ${value}](${baseUrl}/${encodeBadgeSegment(label)}-${encodeBadgeSegment(value)}-${color}?${query})`;
}

export function buildBadgeLink(badgeMarkdown, href) {
  if (!badgeMarkdown || !href) {
    return badgeMarkdown || '';
  }
  return `[${badgeMarkdown}](${href})`;
}

