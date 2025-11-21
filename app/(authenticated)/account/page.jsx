'use client';

import { Suspense } from 'react';
import AccountContent from '@/features/account/components/AccountContent';

export { AccountContent } from '@/features/account/components/AccountContent';

export default function Account() {
  return (
    <Suspense
      fallback={
        <div className="container" style={{ maxWidth: '1200px', padding: '32px 24px' }}>
          <p style={{ color: 'var(--color-text-secondary)' }}>Loading...</p>
        </div>
      }
    >
      <AccountContent />
    </Suspense>
  );
}
