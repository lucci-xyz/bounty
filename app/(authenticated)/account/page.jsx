'use client';

/**
 * Account page for authenticated users.
 * Wraps AccountContent in a Suspense boundary with a loading fallback.
 */
import { Suspense } from 'react';
import { AccountContent } from '@/features/account/components/AccountContent';

/**
 * Renders the account page, showing account details.
 * Shows a loading indicator while AccountContent is loading.
 */
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
