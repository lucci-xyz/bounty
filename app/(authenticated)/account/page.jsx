'use client';

import { Suspense } from 'react';
import AccountContent from '@/features/account/components/AccountContent';

export { AccountContent } from '@/features/account/components/AccountContent';

export default function Account() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto w-full max-w-5xl px-6 py-8 text-muted-foreground">
          <p>Loading...</p>
        </div>
      }
    >
      <AccountContent />
    </Suspense>
  );
}
