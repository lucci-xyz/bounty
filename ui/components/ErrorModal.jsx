'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { AlertIcon } from '@/ui/components/Icons';

/**
 * Generic error modal for surfacing blocking issues to the user.
 * Provides consistent styling with other modals plus optional primary actions.
 */
export default function ErrorModal({
  isOpen,
  title = 'Something went wrong',
  message = 'An unexpected error occurred. Please try again in a moment.',
  details,
  supportLink,
  supportLabel = 'Contact support',
  onPrimaryAction,
  primaryActionLabel = 'Retry',
  onClose,
  dismissLabel = 'Close'
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!isOpen || !mounted) {
    return null;
  }

  const modal = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-background/70 p-5 backdrop-blur-md">
      <div
        role="dialog"
        aria-modal="true"
        aria-live="assertive"
        className="w-full max-w-md space-y-6 rounded-[40px] border border-border/60 bg-card px-8 py-10 text-center shadow-[0_60px_160px_rgba(15,23,42,0.22)]"
      >
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
          <AlertIcon size={26} color="currentColor" />
        </div>
        <div className="space-y-3">
          <h2 className="text-3xl font-light text-foreground/90">{title}</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">{message}</p>
          {details && (
            <pre className="whitespace-pre-wrap break-words rounded-2xl bg-muted/40 px-4 py-3 text-left text-xs font-mono text-muted-foreground">
              {details}
            </pre>
          )}
        </div>

        {supportLink && (
          <a
            href={supportLink}
            target="_blank"
            rel="noopener noreferrer"
            className="block text-sm font-medium text-primary transition-opacity hover:opacity-80"
          >
            {supportLabel} ↗
          </a>
        )}

        <div className="space-y-3">
          {onPrimaryAction && (
            <button
              onClick={onPrimaryAction}
              className="inline-flex w-full items-center justify-center rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
            >
              {primaryActionLabel}
            </button>
          )}
          <button
            onClick={onClose}
            className="inline-flex w-full items-center justify-center rounded-full border border-border/70 px-6 py-3 text-sm font-medium text-foreground transition-colors hover:border-primary"
          >
            {dismissLabel}
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}

