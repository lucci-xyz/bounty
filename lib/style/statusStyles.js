const STATUS_VARIANTS = {
  success: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  error: 'bg-destructive/10 text-destructive border border-destructive/30',
  loading: 'bg-primary/5 text-primary border border-primary/20',
  info: 'bg-muted/40 text-foreground/80 border border-border/60'
};

export const DEFAULT_STATUS_ICONS = {
  success: (
    <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 text-xs font-semibold">
      ✓
    </span>
  ),
  error: (
    <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-destructive/20 text-destructive text-xs font-semibold">
      !
    </span>
  ),
  loading: (
    <span className="inline-flex h-5 w-5 items-center justify-center">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
    </span>
  ),
  info: (
    <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-border/70 text-xs font-semibold text-foreground/70">
      i
    </span>
  )
};

export function normalizeStatusType(type) {
  return type && STATUS_VARIANTS[type] ? type : 'info';
}

export function getStatusClassName(type) {
  return STATUS_VARIANTS[normalizeStatusType(type)];
}

export function getStatusIcon(type, icons = DEFAULT_STATUS_ICONS) {
  const key = normalizeStatusType(type);
  return icons[key] || icons.info;
}

export { STATUS_VARIANTS };

export const ALERT_SEVERITY_STYLES = {
  critical: { emoji: '', label: 'CRITICAL', badgeColor: 'DC2626' },
  high: { emoji: '', label: 'HIGH', badgeColor: 'EA580C' },
  medium: { emoji: '', label: 'MEDIUM', badgeColor: 'CA8A04' },
  low: { emoji: '', label: 'LOW', badgeColor: '2563EB' }
};

