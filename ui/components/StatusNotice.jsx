'use client';

import { cn, getStatusClassName, getStatusIcon } from '@/lib';

export default function StatusNotice({ status, className = '' }) {
  if (!status?.message) return null;

  const variant = getStatusClassName(status.type);
  const icon = getStatusIcon(status.type);

  return (
    <div className={cn('rounded-2xl px-4 py-3 text-sm font-medium', variant, className)}>
      <div className="flex items-center gap-3">
        {icon}
        <p className="text-sm leading-snug">{status.message}</p>
      </div>
    </div>
  );
}

