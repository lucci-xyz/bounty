export default function UserAvatar({ username, avatarUrl, size = 40 }) {
  return (
    <div 
      className="rounded-full flex items-center justify-center overflow-hidden border-2 border-border"
      style={{
      width: `${size}px`,
      height: `${size}px`,
        background: 'var(--color-primary-lighter)'
      }}
    >
      {avatarUrl ? (
        <img 
          src={avatarUrl} 
          alt={username}
          className="w-full h-full object-cover"
        />
      ) : (
        <span 
          className="font-semibold text-primary"
          style={{ fontSize: `${size * 0.4}px` }}
        >
          {username?.[0]?.toUpperCase() || '?'}
        </span>
      )}
    </div>
  );
}

