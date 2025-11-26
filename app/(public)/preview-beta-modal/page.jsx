'use client';

import { useState, useEffect } from 'react';
import BetaAccessModal from '@/features/beta-access/components/BetaAccessModal';

/**
 * Preview page for the beta access modal.
 * 
 * Add ?previewBetaModal=apply to the URL to see the "Apply for Beta" step,
 * or use the buttons below to toggle between different modal states.
 */
export default function PreviewBetaModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [previewMode, setPreviewMode] = useState('apply');

  // Set preview mode from URL parameter on mount
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const urlMode = urlParams.get('previewBetaModal');
    if (urlMode) {
      setPreviewMode(urlMode);
      localStorage.setItem('previewBetaModal', urlMode);
    } else {
      const stored = localStorage.getItem('previewBetaModal');
      if (stored) {
        setPreviewMode(stored);
      }
    }
  }, []);

  return (
    <div className="min-h-screen bg-background p-10">
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="space-y-4">
          <h1 className="text-3xl font-light">Beta Access Modal Preview</h1>
          <p className="text-sm text-muted-foreground">
            Use this page to preview the beta access modal in different states.
            You can also add <code className="bg-muted px-1 py-0.5 rounded">?previewBetaModal=apply</code> to any URL.
          </p>
        </div>

        <div className="space-y-3">
          <h2 className="text-lg font-medium">Preview Modes:</h2>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => {
                setPreviewMode('signin');
                localStorage.setItem('previewBetaModal', 'signin');
                setIsOpen(true);
              }}
              className="rounded-lg border border-border px-4 py-2 text-sm hover:border-primary"
            >
              Sign In Step
            </button>
            <button
              onClick={() => {
                setPreviewMode('apply');
                localStorage.setItem('previewBetaModal', 'apply');
                setIsOpen(true);
              }}
              className="rounded-lg border border-border px-4 py-2 text-sm hover:border-primary"
            >
              Apply Step
            </button>
            <button
              onClick={() => {
                setPreviewMode('pending');
                localStorage.setItem('previewBetaModal', 'pending');
                setIsOpen(true);
              }}
              className="rounded-lg border border-border px-4 py-2 text-sm hover:border-primary"
            >
              Pending Step
            </button>
            <button
              onClick={() => {
                localStorage.removeItem('previewBetaModal');
                setIsOpen(false);
              }}
              className="rounded-lg border border-border px-4 py-2 text-sm hover:border-primary"
            >
              Clear Preview
            </button>
          </div>
        </div>

        <div className="rounded-lg border border-border/60 bg-card p-6">
          <p className="text-sm text-muted-foreground mb-4">
            Current preview mode: <code className="bg-muted px-1 py-0.5 rounded">{previewMode}</code>
          </p>
          <button
            onClick={() => setIsOpen(true)}
            className="rounded-lg bg-primary px-6 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            Open Modal
          </button>
        </div>
      </div>

      <BetaAccessModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        onDismiss={() => setIsOpen(false)}
        dismissLabel="Close"
      />
    </div>
  );
}

