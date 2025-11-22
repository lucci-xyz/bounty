import { cn } from '@/shared/lib';

const SIZE_MAP = {
  34: { wrapper: 'h-[34px] w-[34px]', initials: 'text-[13.6px]' },
  40: { wrapper: 'h-10 w-10', initials: 'text-lg' },
  48: { wrapper: 'h-12 w-12', initials: 'text-xl' },
};

export default function UserAvatar({ username, avatarUrl, size = 40 }) {
  const preset = SIZE_MAP[size] || SIZE_MAP[40];

  return (
    <div
      className={cn(
        'flex items-center justify-center rounded-full border-2 border-border bg-primary/10 text-primary',
        preset.wrapper
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

