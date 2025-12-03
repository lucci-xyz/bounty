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
import { cn } from '@/shared/lib';

// Default icons for common stat types
function MoneyIcon({ className }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function CheckIcon({ className }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function RefundIcon({ className }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
    </svg>
  );
}

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
