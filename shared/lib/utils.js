import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

const STATUS_COLOR_MAP = {
  pending: '#FFA500',
  approved: '#00827B',
  rejected: '#ff3b30',
  open: 'var(--color-primary)',
  resolved: 'var(--color-success)',
  refunded: 'var(--color-warning)',
  canceled: 'var(--color-text-secondary)'
}

/**
 * Shared status-to-color helper used across dashboards and cards.
 */
export function getStatusColor(status, fallback = 'var(--color-text-secondary)') {
  if (!status) {
    return fallback
  }
  return STATUS_COLOR_MAP[status] || fallback
}

const DEFAULT_DATE_FORMAT = {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit'
}

function normalizeDate(value) {
  if (value instanceof Date) {
    return value
  }
  if (typeof value === 'number' || typeof value === 'bigint') {
    return new Date(Number(value))
  }
  if (typeof value === 'string') {
    const numeric = Number(value)
    if (!Number.isNaN(numeric)) {
      return new Date(numeric)
    }
    return new Date(value)
  }
  return new Date(value)
}

/**
 * Consistent date formatting helper shared by dashboard/admin views.
 */
export function formatDate(value, { locale = 'en-US', options = {} } = {}) {
  if (value === undefined || value === null) {
    return ''
  }
  const date = normalizeDate(value)
  if (Number.isNaN(date.getTime())) {
    return ''
  }
  return date.toLocaleDateString(locale, {
    ...DEFAULT_DATE_FORMAT,
    ...options
  })
}

