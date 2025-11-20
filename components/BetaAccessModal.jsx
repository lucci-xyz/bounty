'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';

export default function BetaAccessModal({ isOpen, onClose, onAccessGranted }) {
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

  const modalContent = (
    <div
      className="fixed inset-0 bg-background/70 backdrop-blur-md flex items-center justify-center z-[9999] p-5"
      onClick={(e) => {
        if (step === 'pending' || step === 'rejected') {
          onClose?.();
        } else {
          e.preventDefault();
          e.stopPropagation();
        }
      }}
    >
      <div
        className="bg-card border border-border/40 rounded-2xl max-w-md w-full p-10 shadow-lg relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={() => onClose?.()}
          className="absolute top-4 right-4 w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors text-xl"
        >
          ×
        </button>

        {/* Logo */}
        <div className="text-center mb-6">
          <Image 
            src="/icons/og.png" 
            alt="BountyPay" 
            width={64} 
            height={64}
            className="rounded-xl mx-auto"
          />
        </div>

        {step === 'signin' && (
          <>
            <h2 className="text-foreground text-center mb-3" style={{ fontSize: '24px', fontWeight: '500', letterSpacing: '-0.01em' }}>
              Welcome to BountyPay
            </h2>
            <p className="text-muted-foreground text-center mb-8" style={{ fontSize: '14px', fontWeight: '300', lineHeight: '1.6' }}>
              We're currently in private beta. Sign in with GitHub to request access.
            </p>
            <button
              onClick={handleSignIn}
              className="premium-btn w-full bg-primary text-primary-foreground flex items-center justify-center gap-3"
              style={{ padding: '12px 24px', fontSize: '15px' }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
              </svg>
              Sign in with GitHub
            </button>
          </>
        )}

        {step === 'apply' && (
          <>
            <h2 className="text-foreground text-center mb-3" style={{ fontSize: '24px', fontWeight: '500', letterSpacing: '-0.01em' }}>
              Beta Access Required
            </h2>
            <p className="text-muted-foreground text-center mb-8" style={{ fontSize: '14px', fontWeight: '300', lineHeight: '1.6' }}>
              BountyPay is currently in private beta. Would you like to apply for early access?
            </p>
            {error && (
              <div className="px-4 py-3 bg-destructive/10 border border-destructive/30 rounded-xl text-destructive mb-5 text-center" style={{ fontSize: '13px', fontWeight: '400' }}>
                {error}
              </div>
            )}
            <button
              onClick={handleApply}
              disabled={loading}
              className="premium-btn w-full bg-primary text-primary-foreground disabled:opacity-50"
              style={{ padding: '12px 24px', fontSize: '15px' }}
            >
              {loading ? 'Applying...' : 'Apply for Beta Access'}
            </button>
          </>
        )}

        {step === 'pending' && (
          <>
            <h2 className="text-foreground text-center mb-3" style={{ fontSize: '24px', fontWeight: '500', letterSpacing: '-0.01em' }}>
              Application Received
            </h2>
            <p className="text-muted-foreground text-center" style={{ fontSize: '14px', fontWeight: '300', lineHeight: '1.6' }}>
              Thank you for applying. We'll review your application and notify you once you've been approved.
            </p>
          </>
        )}

        {step === 'approved' && (
          <>
            <h2 className="text-primary text-center mb-3" style={{ fontSize: '24px', fontWeight: '500', letterSpacing: '-0.01em' }}>
              Welcome to Beta
            </h2>
            <p className="text-muted-foreground text-center" style={{ fontSize: '14px', fontWeight: '300', lineHeight: '1.6' }}>
              Your access has been approved.
            </p>
          </>
        )}

        {step === 'rejected' && (
          <>
            <h2 className="text-foreground text-center mb-3" style={{ fontSize: '24px', fontWeight: '500', letterSpacing: '-0.01em' }}>
              Application Not Approved
            </h2>
            <p className="text-muted-foreground text-center" style={{ fontSize: '14px', fontWeight: '300', lineHeight: '1.6' }}>
              We cannot provide beta access at this time. Thank you for your interest.
            </p>
          </>
        )}
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}

