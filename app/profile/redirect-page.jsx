'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ProfileRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/account?tab=settings');
  }, [router]);

  return (
    <div className="container" style={{ maxWidth: '1200px', padding: '32px 24px' }}>
      <p style={{ color: 'var(--color-text-secondary)' }}>Redirecting...</p>
    </div>
  );
}

