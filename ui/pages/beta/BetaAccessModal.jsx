'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useBetaAccess } from '@/ui/hooks/useBetaAccess';
import { resolveBetaStep } from '@/ui/pages/beta/lib/utils';
import { isValidEmail } from '@/lib/validation';
import { applyForBeta } from '@/api/beta';
import { redirectToGithubSignIn } from '@/lib/navigation';

/**
 * BetaAccessModal
 *
 * Displays a modal dialog for beta access application and status.
 *
 * @param {object} props
 * @param {boolean} props.isOpen - If true, the modal is shown.
 * @param {function} props.onClose - Called to close the modal.
 * @param {function} [props.onAccessGranted] - Called when access is approved.
 * @param {function} [props.onDismiss] - Optional dismiss handler.
 * @param {string} [props.dismissLabel='Close'] - Text for dismiss button.
 */

export default function BetaAccessModal({ isOpen, onClose, onAccessGranted, onDismiss, dismissLabel = 'Close' }) {
  const {
    hasAccess,
    betaStatus,
    loading: betaLoading,
    refreshAccess,
    betaProgramEnabled
  } = useBetaAccess();
  const [step, setStep] = useState('loading');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [mounted, setMounted] = useState(false);
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');

  if (!betaProgramEnabled) {
    return null;
  }

  // Ensure portal rendering only after mount (fixes Next.js hydration)
  useEffect(() => {
    setMounted(true);
  }, []);

  // Note: We intentionally do NOT call refreshAccess() when modal opens.
  // The BetaAccessProvider already checks beta status on mount.
  // Calling refreshAccess() here caused an infinite loop because:
  // 1. refreshAccess() sets loading=true
  // 2. Parent component re-renders with different JSX structure based on betaLoading
  // 3. Modal remounts in different tree position
  // 4. Effect runs again → calls refreshAccess() → infinite loop

  // Reset email field when modal closes or step changes
  useEffect(() => {
    if (!isOpen) {
      setEmail('');
      setEmailError('');
    }
    if (step !== 'apply') {
      setEmailError('');
    }
  }, [isOpen, step]);

  // Set the correct step based on beta status
  // Only update step when it actually changes to prevent unnecessary re-renders
  useEffect(() => {
    if (!isOpen) return;
    const nextStep = resolveBetaStep(betaStatus, hasAccess);
    
    // Only update state if step actually changed - prevents flickering
    setStep((prevStep) => (prevStep !== nextStep ? nextStep : prevStep));

    // If access was granted, call onAccessGranted and auto-close shortly after
    if (nextStep === 'approved') {
      onAccessGranted?.();
      const timeout = setTimeout(() => onClose?.(), 2000);
      return () => clearTimeout(timeout);
    }
  }, [betaStatus, hasAccess, isOpen, onAccessGranted, onClose]);

  // Poll while awaiting access approval (only when step is pending and modal is open)
  useEffect(() => {
    if (!isOpen || step !== 'pending') return;
    
    // Poll every 5 seconds to check if access has been approved
    const interval = setInterval(() => {
      refreshAccess();
    }, 5000);
    
    return () => clearInterval(interval);
  }, [isOpen, step, refreshAccess]);

  /**
   * Redirects the user to GitHub sign in.
   * Preserve the current URL so users resume the flow after authenticating.
   */
  const handleSignIn = () => {
    const returnTo =
      typeof window !== 'undefined' ? `${window.location.pathname}${window.location.search || ''}` : '/';
    redirectToGithubSignIn(returnTo || '/');
  };

  /**
   * Validates the email input
   */
  const validateEmailInput = () => {
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setEmailError('Email is required');
      return false;
    }
    if (!isValidEmail(trimmedEmail)) {
      setEmailError('Please enter a valid email address');
      return false;
    }
    setEmailError('');
    return true;
  };

  /**
   * Submits a beta access application.
   */
  const handleApply = async () => {
    // Validate email before submitting
    if (!validateEmailInput()) {
      return;
    }

    setLoading(true);
    setError(null);
    setEmailError('');

    try {
      await applyForBeta(email.trim());
      setStep('pending');
      refreshAccess();
    } catch (err) {
      setError(err.message || 'Failed to apply for beta access');
    } finally {
      setLoading(false);
    }
  };

  // Don't render if the portal hasn't mounted yet
  if (!mounted) return null;

  // Use beta loading state if relevant
  const effectiveStep = step === 'loading' && betaLoading ? 'loading' : step;

  /**
   * Get content for the current step of the modal.
   */
  const renderContent = () => {
    switch (effectiveStep) {
      case 'signin':
        return {
          title: 'Welcome to BountyPay',
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
          emailInput: (
            <div className="space-y-2">
              <label htmlFor="beta-email" className="block text-xs font-medium text-foreground/70">
                Email Address
              </label>
              <input
                id="beta-email"
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (emailError) {
                    setEmailError('');
                  }
                }}
                onBlur={validateEmailInput}
                placeholder="you@example.com"
                disabled={loading}
                className={`w-full rounded-2xl border px-4 py-3 text-sm text-foreground transition-all focus:ring-2 focus:ring-primary/10 ${
                  emailError
                    ? 'border-destructive/50 bg-destructive/5 focus:border-destructive'
                    : 'border-border/60 bg-background focus:border-primary'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              />
              {emailError && (
                <p className="text-xs text-destructive">{emailError}</p>
              )}
            </div>
          ),
          actions: (
            <button
              onClick={handleApply}
              disabled={loading || !email.trim() || !isValidEmail(email.trim())}
              className="inline-flex w-full items-center justify-center rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
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
      case 'loading':
        return {
          title: 'Checking access',
          body: 'Hang tight while we verify your beta status...'
        };
      default:
        return {
          title: 'Checking access',
          body: 'Hang tight while we verify your beta status...'
        };
    }
  };

  const { title, body, emailInput, actions } = renderContent();

  /**
   * Dismiss handler for the modal
   */
  const handleDismiss = () => {
    if (onDismiss) {
      onDismiss();
    } else {
      onClose?.();
    }
  };

  // Modal markup - keep portal mounted, hide with CSS to prevent backdrop-blur flickering
  const modalContent = (
    <div 
      className={`fixed inset-0 z-[9999] bg-background/70 backdrop-blur-md flex items-center justify-center p-5 transition-opacity duration-200 ${
        isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
      }`}
    >
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
        {emailInput}
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
