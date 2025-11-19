'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';

export default function BetaAccessModal({ isOpen, onClose }) {
  const [step, setStep] = useState('signin'); // signin, apply, pending, approved, rejected
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

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
        // Close modal and refresh page after a delay
        setTimeout(() => {
          onClose?.();
          window.location.reload();
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

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.7)',
        backdropFilter: 'blur(12px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '20px'
      }}
      onClick={(e) => {
        // Prevent closing unless approved
        e.preventDefault();
        e.stopPropagation();
      }}
    >
      <div
        style={{
          background: 'var(--color-background)',
          borderRadius: '16px',
          maxWidth: '480px',
          width: '100%',
          padding: '40px',
          boxShadow: '0 24px 48px rgba(0, 0, 0, 0.2)',
          position: 'relative'
        }}
      >
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <Image 
            src="/icons/og.png" 
            alt="BountyPay" 
            width={64} 
            height={64}
            style={{ borderRadius: '12px', margin: '0 auto' }}
          />
        </div>

        {step === 'signin' && (
          <>
            <h2 style={{ 
              fontSize: '28px', 
              fontWeight: '600', 
              color: 'var(--color-text)', 
              marginBottom: '12px',
              textAlign: 'center'
            }}>
              Welcome to BountyPay
            </h2>
            <p style={{ 
              color: 'var(--color-text-secondary)', 
              marginBottom: '32px',
              textAlign: 'center',
              lineHeight: '1.6'
            }}>
              We're currently in private beta. Sign in with GitHub to request access.
            </p>
            <button
              onClick={handleSignIn}
              style={{
                width: '100%',
                padding: '14px 24px',
                borderRadius: '10px',
                border: 'none',
                fontSize: '16px',
                fontWeight: '600',
                background: 'var(--color-primary)',
                color: 'white',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '12px'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--color-secondary)';
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 8px 24px rgba(0, 130, 123, 0.3)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'var(--color-primary)';
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
              }}
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
            <h2 style={{ 
              fontSize: '28px', 
              fontWeight: '600', 
              color: 'var(--color-text)', 
              marginBottom: '12px',
              textAlign: 'center'
            }}>
              Beta Access Required
            </h2>
            <p style={{ 
              color: 'var(--color-text-secondary)', 
              marginBottom: '32px',
              textAlign: 'center',
              lineHeight: '1.6'
            }}>
              BountyPay is currently in private beta. Would you like to apply for early access?
            </p>
            {error && (
              <div style={{
                padding: '12px',
                background: 'rgba(255, 59, 48, 0.1)',
                border: '1px solid rgba(255, 59, 48, 0.3)',
                borderRadius: '8px',
                color: '#ff3b30',
                fontSize: '14px',
                marginBottom: '20px',
                textAlign: 'center'
              }}>
                {error}
              </div>
            )}
            <button
              onClick={handleApply}
              disabled={loading}
              style={{
                width: '100%',
                padding: '14px 24px',
                borderRadius: '10px',
                border: 'none',
                fontSize: '16px',
                fontWeight: '600',
                background: loading ? 'var(--color-background-secondary)' : 'var(--color-primary)',
                color: loading ? 'var(--color-text-secondary)' : 'white',
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                if (!loading) {
                  e.currentTarget.style.background = 'var(--color-secondary)';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 8px 24px rgba(0, 130, 123, 0.3)';
                }
              }}
              onMouseLeave={(e) => {
                if (!loading) {
                  e.currentTarget.style.background = 'var(--color-primary)';
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }
              }}
            >
              {loading ? 'Applying...' : 'Apply for Beta Access'}
            </button>
          </>
        )}

        {step === 'pending' && (
          <>
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <div style={{
                width: '80px',
                height: '80px',
                borderRadius: '50%',
                background: 'rgba(0, 130, 123, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto',
                fontSize: '40px'
              }}>
                ⏳
              </div>
            </div>
            <h2 style={{ 
              fontSize: '28px', 
              fontWeight: '600', 
              color: 'var(--color-text)', 
              marginBottom: '12px',
              textAlign: 'center'
            }}>
              Application Received
            </h2>
            <p style={{ 
              color: 'var(--color-text-secondary)', 
              marginBottom: '32px',
              textAlign: 'center',
              lineHeight: '1.6'
            }}>
              Thank you for applying! We'll review your application and notify you once you've been approved.
            </p>
          </>
        )}

        {step === 'approved' && (
          <>
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <div style={{
                width: '80px',
                height: '80px',
                borderRadius: '50%',
                background: 'rgba(0, 130, 123, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto',
                fontSize: '40px'
              }}>
                ✓
              </div>
            </div>
            <h2 style={{ 
              fontSize: '28px', 
              fontWeight: '600', 
              color: 'var(--color-primary)', 
              marginBottom: '12px',
              textAlign: 'center'
            }}>
              Welcome to the Beta!
            </h2>
            <p style={{ 
              color: 'var(--color-text-secondary)', 
              textAlign: 'center',
              lineHeight: '1.6'
            }}>
              Your access has been approved. Enjoy using BountyPay!
            </p>
          </>
        )}

        {step === 'rejected' && (
          <>
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <div style={{
                width: '80px',
                height: '80px',
                borderRadius: '50%',
                background: 'rgba(255, 59, 48, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto',
                fontSize: '40px'
              }}>
                ✕
              </div>
            </div>
            <h2 style={{ 
              fontSize: '28px', 
              fontWeight: '600', 
              color: 'var(--color-text)', 
              marginBottom: '12px',
              textAlign: 'center'
            }}>
              Application Not Approved
            </h2>
            <p style={{ 
              color: 'var(--color-text-secondary)', 
              textAlign: 'center',
              lineHeight: '1.6'
            }}>
              Unfortunately, we cannot provide beta access at this time. Thank you for your interest!
            </p>
          </>
        )}
      </div>
    </div>
  );
}

