'use client';

/**
 * Account page for authenticated users.
 * Wraps AccountContent in a Suspense boundary with a loading fallback.
 */
import { AccountContent } from '@/ui/pages/account/AccountContent';
import { AccountProvider } from '@/ui/providers/AccountProvider';

/**
 * Renders the account page, showing account details.
 * Shows a loading indicator while AccountContent is loading.
 */
export default function Account() {
  return (
    <AccountProvider>
      <AccountContent />
    </AccountProvider>
  );
}

