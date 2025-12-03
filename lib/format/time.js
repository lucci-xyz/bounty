export function formatTimeLeft(deadline) {
  if (!deadline) return '-';
  const deadlineMs = Number(deadline) * 1000;
  if (!Number.isFinite(deadlineMs)) return '-';
  const diff = deadlineMs - Date.now();
  if (diff < 0) return 'Expired';

  const dayMs = 1000 * 60 * 60 * 24;
  const hourMs = 1000 * 60 * 60;
  const days = Math.floor(diff / dayMs);
  if (days > 0) {
    return `${days}d`;
  }
  const hours = Math.floor((diff % dayMs) / hourMs);
  if (hours > 0) {
    return `${hours}h`;
  }
  return '< 1h';
}

export function formatDeadlineDate(deadline, localeOptions) {
  if (!deadline) return '-';
  const date = new Date(Number(deadline) * 1000);
  if (Number.isNaN(date.getTime())) {
    return '-';
  }
  return date.toLocaleDateString(localeOptions?.locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    ...(localeOptions?.options || {})
  });
}

export function formatTimeRemaining(deadline) {
  const label = formatTimeLeft(deadline);
  if (!label || label === '-') {
    return 'Unknown';
  }
  if (label === '< 1h') {
    return 'Less than 1h';
  }
  if (label.endsWith('d')) {
    const days = parseInt(label.slice(0, -1), 10);
    if (Number.isNaN(days)) return label;
    if (days === 0) return 'Today';
    if (days === 1) return '1 day';
    return `${days} days`;
  }
  if (label.endsWith('h')) {
    const hours = parseInt(label.slice(0, -1), 10);
    if (Number.isNaN(hours)) return label;
    if (hours === 1) return '1 hour';
    return `${hours} hours`;
  }
  return label;
}

