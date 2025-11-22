const DEFAULT_DATE_FORMAT = {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit'
};

function normalizeDate(value) {
  if (value instanceof Date) {
    return value;
  }
  if (typeof value === 'number' || typeof value === 'bigint') {
    return new Date(Number(value));
  }
  if (typeof value === 'string') {
    const numeric = Number(value);
    if (!Number.isNaN(numeric)) {
      return new Date(numeric);
    }
    return new Date(value);
  }
  return new Date(value);
}

export function formatDate(value, { locale = 'en-US', options = {} } = {}) {
  if (value === undefined || value === null) {
    return '';
  }
  const date = normalizeDate(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  return date.toLocaleDateString(locale, {
    ...DEFAULT_DATE_FORMAT,
    ...options
  });
}

