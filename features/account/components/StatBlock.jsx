"use client";

/**
 * StatBlock
 *
 * Displays a statistic with a label, value, and optional hint below.
 *
 * @param {Object} props
 * @param {string} props.label - The text label for the stat.
 * @param {string|number|React.ReactNode} props.value - The main value to display.
 * @param {string} [props.hint] - Optional hint or description under the value.
 * @param {string} [props.className] - Optional CSS class for the root container.
 * @param {string} [props.valueClassName] - Optional CSS class for the value element.
 */
import { cn, STAT_HINT_CLASS, STAT_LABEL_CLASS, STAT_VALUE_CLASS } from '@/shared/lib';

export function StatBlock({ label, value, hint, className, valueClassName }) {
  return (
    <div className={cn('stat-card', className)}>
      <div className={STAT_LABEL_CLASS}>{label}</div>
      <div className={cn(STAT_VALUE_CLASS, valueClassName)}>{value}</div>
      {hint && <p className={STAT_HINT_CLASS}>{hint}</p>}
    </div>
  );
}

