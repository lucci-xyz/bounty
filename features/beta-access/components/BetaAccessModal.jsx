'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { MoneyIcon } from '@/shared/components/Icons';

export default function BetaAccessModal({ isOpen, onClose, onAccessGranted, onDismiss, dismissLabel = 'Close' }) {
  const [step, setStep] = useState('signin'); // signin, apply, pending, approved, rejected
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Check beta access status when modal opens
  useEffect(() => {
    if (isOpen) {
      checkBetaStatus();
    }
  }, [isOpen]);

  // Poll for status updates when in pending state
  useEffect(() => {
    if (step === 'pending') {
      const interval = setInterval(() => {
        checkBetaStatus();
      }, 5000); // Check every 5 seconds
      
      return () => clearInterval(interval);
    }
  }, [step]);

  const checkBetaStatus = async () => {
    try {
      const res = await fetch('/api/beta/check');
      
      if (!res.ok) {
        // If there's an error (like session secret missing), default to signin
        setStep('signin');
        return;
      }
      
      const data = await res.json();
      
      if (data.needsAuth) {
        setStep('signin');
      } else if (data.needsApplication) {
        setStep('apply');
      } else if (data.hasAccess) {
        setStep('approved');
        onAccessGranted?.();
        // Close modal after a delay
        setTimeout(() => {
          onClose?.();
        }, 2000);
      } else {
        setStep(data.status || 'pending');
      }
    } catch (err) {
      console.error('Error checking beta status:', err);
      // Default to signin step on error
      setStep('signin');
    }
  };

  const handleSignIn = () => {
    window.location.href = `/api/oauth/github?returnTo=${encodeURIComponent('/')}`;
  };

  const handleApply = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const res = await fetch('/api/beta/apply', {
        method: 'POST'
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Failed to apply');
      }
      
      setStep('pending');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !mounted) return null;

  const renderContent = () => {
    switch (step) {
      case 'signin':
        return {
          title: 'Welcome to Lucci',
          body: 'We’re currently in private beta. Sign in with GitHub to request access.',
          actions: (
            <button
              onClick={handleSignIn}
              className="inline-flex w-full items-center justify-center rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
            >
              Sign in with GitHub
            </button>
          )
        };
      case 'apply':
        return {
          title: 'Beta Access Required',
          body: 'Request early access to start funding issues and automating payouts.',
          actions: (
            <button
              onClick={handleApply}
              disabled={loading}
              className="inline-flex w-full items-center justify-center rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {loading ? 'Applying...' : 'Apply for Beta'}
            </button>
          )
        };
      case 'pending':
        return {
          title: 'Application Received',
          body: 'Thanks for applying. We’ll email you as soon as your access is approved.'
        };
      case 'approved':
        return {
          title: 'Welcome to Beta',
          body: 'Your access has been approved. Redirecting you back in a moment...'
        };
      case 'rejected':
        return {
          title: 'Application Not Approved',
          body: 'We can’t provide beta access right now, but appreciate your interest.'
        };
      default:
        return {
          title: 'Checking access',
          body: 'Hang tight while we verify your beta status...'
        };
    }
  };

  const { title, body, actions } = renderContent();

  const handleDismiss = () => {
    if (onDismiss) {
      onDismiss();
    } else {
      onClose?.();
    }
  };

  const modalContent = (
    <div className="fixed inset-0 z-[9999] bg-background/70 backdrop-blur-md flex items-center justify-center p-5">
      <div className="w-full max-w-md rounded-[40px] border border-border/60 bg-card px-8 py-12 shadow-[0_60px_160px_rgba(15,23,42,0.22)] space-y-7">
        <div className="text-center space-y-3">
          <h2 className="text-3xl font-light text-foreground/90">{title}</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">{body}</p>
        </div>
        {error && (
          <div className="rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive text-center">
            {error}
          </div>
        )}
        {actions}

        {onDismiss && (
          <button
            onClick={handleDismiss}
            className="inline-flex w-full items-center justify-center rounded-full border border-border/70 px-6 py-3 text-sm font-medium text-foreground transition-colors hover:border-primary"
          >
            {dismissLabel}
          </button>
        )}
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}

