"use client";

/**
 * StatBlock
 *
 * Displays a statistic with a label, value, optional hint, and icon.
 * Updated design with visual indicator icons.
 *
 * @param {Object} props
 * @param {string} props.label - The text label for the stat.
 * @param {string|number|React.ReactNode} props.value - The main value to display.
 * @param {string} [props.hint] - Optional hint or description under the value.
 * @param {string} [props.className] - Optional CSS class for the root container.
 * @param {string} [props.valueClassName] - Optional CSS class for the value element.
 * @param {React.ReactNode} [props.icon] - Optional icon element.
 * @param {string} [props.iconBgClass] - Optional class for icon background (e.g., 'bg-emerald-50').
 * @param {string} [props.iconTextClass] - Optional class for icon color (e.g., 'text-emerald-600').
 */
import { cn } from '@/lib';
import { MoneyIcon, CheckIcon, RefundIcon } from '@/ui/components/Icons';

export function StatBlock({ 
  label, 
  value, 
  hint, 
  className, 
  valueClassName,
  icon,
  iconBgClass = 'bg-primary/10',
  iconTextClass = 'text-primary',
  showIcon = true
}) {
  // Choose a default icon based on label if none provided
  const getDefaultIcon = () => {
    const labelLower = label?.toLowerCase() || '';
    if (labelLower.includes('locked') || labelLower.includes('value')) {
      return <MoneyIcon className="w-5 h-5" />;
    }
    if (labelLower.includes('paid') || labelLower.includes('resolved')) {
      return <CheckIcon className="w-5 h-5" />;
    }
    if (labelLower.includes('refund')) {
      return <RefundIcon className="w-5 h-5" />;
    }
    return <MoneyIcon className="w-5 h-5" />;
  };

  const IconComponent = icon || getDefaultIcon();

  return (
    <div className={cn(
      'bg-card border border-border rounded-2xl p-5 transition-all hover:shadow-md',
      className
    )}>
      <div className={cn(
        'flex items-start justify-between gap-3',
        showIcon ? 'mb-3' : 'mb-1'
      )}>
        <span className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
          {label}
        </span>
        {showIcon && (
          <div className={cn(
            'w-9 h-9 rounded-xl flex items-center justify-center shrink-0',
            iconBgClass
          )}>
            <div className={iconTextClass}>
              {IconComponent}
            </div>
          </div>
        )}
      </div>
      <div className={cn(
        'font-instrument-serif text-3xl text-foreground tracking-tight',
        valueClassName
      )}>
        {value}
      </div>
      {hint && (
        <p className="text-xs text-muted-foreground mt-1.5">
          {hint}
        </p>
      )}
    </div>
  );
}
