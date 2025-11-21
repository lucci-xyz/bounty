export default function UserAvatar({ username, avatarUrl, size = 40 }) {
  return (
    <div style={{
      width: `${size}px`,
      height: `${size}px`,
      borderRadius: '50%',
      background: 'var(--color-primary-lighter)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
      border: '2px solid var(--color-border)'
    }}>
      {avatarUrl ? (
        <img 
          src={avatarUrl} 
          alt={username}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover'
          }}
        />
      ) : (
        <span style={{
          fontSize: `${size * 0.4}px`,
          fontWeight: '600',
          color: 'var(--color-primary)'
        }}>
          {username?.[0]?.toUpperCase() || '?'}
        </span>
      )}
    </div>
  );
}

