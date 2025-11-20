import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="max-w-7xl mx-auto px-6 py-24 text-center">
      <p
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '8px 18px',
          borderRadius: '999px',
          fontSize: '12px',
          letterSpacing: '0.4em',
          textTransform: 'uppercase',
          fontWeight: 600,
          background: 'rgba(0,130,123,0.12)',
          color: '#00827B',
          marginBottom: '32px'
        }}
      >
        404
      </p>

      <h1 className="text-4xl md:text-5xl font-light tracking-tight mb-6 text-foreground/90">
        We couldn’t find that page
      </h1>

      <p className="text-base text-muted-foreground max-w-2xl mx-auto mb-14 leading-relaxed">
        The link you followed might be broken or the page may have been moved. Let’s get you
        back to something useful.
      </p>

      <div className="flex justify-center mt-6">
        <Link href="/">
          <button className="px-6 py-3 rounded-full text-sm font-medium bg-primary text-primary-foreground hover:opacity-90 transition-opacity">
            Browse bounties
          </button>
        </Link>
      </div>
    </div>
  );
}