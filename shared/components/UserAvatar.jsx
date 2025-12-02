import { cn } from '@/shared/lib';

const SIZE_MAP = {
  32: { wrapper: 'h-8 w-8', initials: 'text-sm' },
  34: { wrapper: 'h-[34px] w-[34px]', initials: 'text-[13.6px]' },
  40: { wrapper: 'h-10 w-10', initials: 'text-lg' },
  48: { wrapper: 'h-12 w-12', initials: 'text-xl' }
};

const VARIANT_MAP = {
  subtle: 'border-2 border-border bg-primary/10 text-primary',
  solid: 'bg-primary text-primary-foreground'
};

export default function UserAvatar({
  username,
  avatarUrl,
  size = 40,
  variant = 'subtle',
  className
}) {
  const preset = SIZE_MAP[size] || SIZE_MAP[40];
  const appearance = VARIANT_MAP[variant] || VARIANT_MAP.subtle;

  return (
    <div
      className={cn(
        'flex items-center justify-center rounded-full overflow-hidden',
        preset.wrapper,
        appearance,
        className
      )}
    >
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt={username}
          className="h-full w-full rounded-full object-cover"
        />
      ) : (
        <span className={cn('font-semibold', preset.initials)}>
          {username?.[0]?.toUpperCase() || '?'}
        </span>
      )}
    </div>
  );
}

