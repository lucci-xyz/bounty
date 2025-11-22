const STATUS_COLOR_MAP = {
  pending: '#FFA500',
  approved: '#00827B',
  rejected: '#ff3b30',
  open: 'var(--color-primary)',
  resolved: 'var(--color-success)',
  refunded: 'var(--color-warning)',
  canceled: 'var(--color-text-secondary)'
};

export function getStatusColor(status, fallback = 'var(--color-text-secondary)') {
  if (!status) {
    return fallback;
  }
  return STATUS_COLOR_MAP[status] || fallback;
}

