'use client';

/**
 * Sign In / Sign Up page
 * Handles GitHub OAuth, wallet connection, and optional email for notifications.
 */

import { Suspense, useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount, useWalletClient } from 'wagmi';
import { GitHubIcon, CheckCircleIcon, WalletIcon, MailIcon } from '@/ui/components/Icons';
import { useGithubUser } from '@/ui/hooks/useGithubUser';
import { getUserProfile, requestEmailVerification } from '@/api/user';
import { getNonce, verifyWalletSignature, linkWallet, buildSiweMessage } from '@/api/wallet';
import { useErrorModal } from '@/ui/providers/ErrorModalProvider';
import StatusNotice from '@/ui/components/StatusNotice';

// Card container styles
const cardClasses = 'rounded-2xl border border-border/60 bg-card p-6 shadow-sm';

/**
 * Main sign-in content component
 */
function SignInContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const returnTo = searchParams.get('returnTo') || '/app';
  
  // Auth state
  const { githubUser, githubUserLoading } = useGithubUser();
  const { address, isConnected, chain } = useAccount();
  const { data: walletClient } = useWalletClient();
  const { showError } = useErrorModal();
  
  // Flow state
  const [isMounted, setIsMounted] = useState(false);
  const [checkingProfile, setCheckingProfile] = useState(false);
  const [hasLinkedWallet, setHasLinkedWallet] = useState(false);
  const [hasVerifiedEmail, setHasVerifiedEmail] = useState(false);
  const [userEmail, setUserEmail] = useState(null); // Store the actual email value
  const [profileCreated, setProfileCreated] = useState(false);
  const [status, setStatus] = useState({ message: '', type: '' });
  const [isProcessing, setIsProcessing] = useState(false);
  const [profileError, setProfileError] = useState(null);
  
  // Email state
  const [email, setEmail] = useState('');
  const [emailSent, setEmailSent] = useState(false);
  const [emailStep, setEmailStep] = useState(false);
  
  // Current step tracking
  const [currentStep, setCurrentStep] = useState(1);
  
  // Welcome back redirect state
  const [showWelcomeBack, setShowWelcomeBack] = useState(false);
  const [redirecting, setRedirecting] = useState(false);
  const redirectTimerRef = useRef(null);
  
  useEffect(() => {
    setIsMounted(true);
    
    // Cleanup redirect timer on unmount
    return () => {
      if (redirectTimerRef.current) {
        clearTimeout(redirectTimerRef.current);
      }
    };
  }, []);
  
  // Check user's profile when GitHub user is available
  useEffect(() => {
    if (!githubUser) return;
    if (checkingProfile) return;
    
    let cancelled = false;
    
    const checkProfile = async () => {
      setCheckingProfile(true);
      setProfileError(null);
      
      // Add timeout to prevent hanging
      const timeoutId = setTimeout(() => {
        if (!cancelled) {
          setCheckingProfile(false);
          setCurrentStep(2);
        }
      }, 5000);
      
      try {
        const profile = await getUserProfile();
        clearTimeout(timeoutId);
        if (cancelled) return;
        
        // Check wallet - handle both object and null/undefined cases
        const walletAddress = profile?.wallet?.walletAddress;
        const hasWallet = Boolean(walletAddress && typeof walletAddress === 'string' && walletAddress.length > 0);
        
        if (hasWallet) {
          setHasLinkedWallet(true);
          setCurrentStep(3);
        } else {
          setCurrentStep(2);
        }
        
        // Check email - handle both object and null/undefined cases
        // The email is stored on the user object when verified
        const verifiedEmail = profile?.user?.email;
        const hasEmail = Boolean(verifiedEmail && typeof verifiedEmail === 'string' && verifiedEmail.length > 0);
        
        if (hasEmail) {
          setHasVerifiedEmail(true);
          setUserEmail(verifiedEmail);
        }
        
        // If user has all three (GitHub + wallet + email), show welcome back
        if (hasWallet && hasEmail) {
          setShowWelcomeBack(true);
        }
      } catch (err) {
        clearTimeout(timeoutId);
        if (cancelled) return;
        // Log error but proceed to wallet step
        console.error('Error fetching profile:', err);
        setProfileError(err?.message || 'Failed to load profile');
        setCurrentStep(2);
      } finally {
        if (!cancelled) {
          setCheckingProfile(false);
        }
      }
    };
    
    checkProfile();
    
    return () => {
      cancelled = true;
    };
  }, [githubUser?.githubId]);
  
  // Handle "Welcome back" auto-redirect with animation
  useEffect(() => {
    if (showWelcomeBack && hasLinkedWallet && hasVerifiedEmail && !redirecting) {
      setRedirecting(true);
      
      // Delay redirect to show the welcome message
      redirectTimerRef.current = setTimeout(() => {
        // Navigate to the bounties homepage (or returnTo if specified)
        const destination = returnTo === '/app' ? '/' : returnTo;
        router.push(destination);
      }, 2500); // 2.5 second delay for animation
    }
  }, [showWelcomeBack, hasLinkedWallet, hasVerifiedEmail, redirecting, returnTo, router]);
  
  // Auto-link wallet when connected
  useEffect(() => {
    if (
      githubUser &&
      isConnected &&
      address &&
      walletClient &&
      !hasLinkedWallet &&
      !isProcessing &&
      !profileCreated &&
      currentStep === 2
    ) {
      createProfileWithWallet();
    }
  }, [githubUser, isConnected, address, walletClient, hasLinkedWallet, isProcessing, profileCreated, currentStep]);
  
  /**
   * Start GitHub OAuth flow
   */
  const authenticateGitHub = useCallback(() => {
    const currentUrl = window.location.pathname + window.location.search;
    window.location.href = `/api/oauth/github?returnTo=${encodeURIComponent(currentUrl)}`;
  }, []);
  
  /**
   * Link wallet via SIWE signature
   */
  const createProfileWithWallet = useCallback(async () => {
    if (isProcessing) return;
    
    try {
      setIsProcessing(true);
      setStatus({ message: 'Please sign the message in your wallet...', type: 'loading' });
      
      if (!isConnected || !address) {
        throw new Error('Please connect your wallet first');
      }
      if (!walletClient) {
        throw new Error('Wallet client not available');
      }
      if (!githubUser) {
        throw new Error('Missing GitHub session');
      }
      
      const { nonce } = await getNonce();
      
      const { message: messageText } = await buildSiweMessage({
        address,
        nonce,
        chainId: chain?.id || 1,
        domain: window.location.host,
        uri: window.location.origin,
        statement: 'Sign in to BountyPay to receive bounty payments.'
      });
      
      if (!messageText) {
        throw new Error('Failed to build verification message');
      }
      
      const signature = await walletClient.signMessage({ message: messageText });
      
      setStatus({ message: 'Verifying signature...', type: 'loading' });
      await verifyWalletSignature({ message: messageText, signature });
      
      setStatus({ message: 'Setting up your account...', type: 'loading' });
      await linkWallet({
        githubId: githubUser.githubId,
        githubUsername: githubUser.githubUsername,
        walletAddress: address
      });
      
      setProfileCreated(true);
      setHasLinkedWallet(true);
      setCurrentStep(3);
      setStatus({ message: 'Wallet linked successfully!', type: 'success' });
      
      // Re-fetch profile to check if user has email - if so, show welcome back
      try {
        const updatedProfile = await getUserProfile();
        const verifiedEmail = updatedProfile?.user?.email;
        if (verifiedEmail && typeof verifiedEmail === 'string' && verifiedEmail.length > 0) {
          setHasVerifiedEmail(true);
          setUserEmail(verifiedEmail);
          setShowWelcomeBack(true);
        }
      } catch (err) {
        // Non-critical, continue without welcome back flow
        console.error('Error checking email after wallet link:', err);
      }
      
      setTimeout(() => setStatus({ message: '', type: '' }), 2000);
    } catch (err) {
      if (err?.message?.includes('User rejected') || err?.code === 4001) {
        setStatus({ message: 'Signature cancelled. Please try again.', type: 'error' });
      } else {
        setStatus({ message: err?.message || 'Failed to link wallet', type: 'error' });
        showError({ title: 'Wallet Link Failed', message: err?.message });
      }
    } finally {
      setIsProcessing(false);
    }
  }, [isConnected, address, walletClient, githubUser, chain, isProcessing, showError]);
  
  /**
   * Send email verification
   */
  const handleSendEmailVerification = async () => {
    if (!email || isProcessing) return;
    
    try {
      setIsProcessing(true);
      setStatus({ message: 'Sending verification email...', type: 'loading' });
      
      await requestEmailVerification(email);
      
      setEmailSent(true);
      setStatus({ message: 'Verification email sent!', type: 'success' });
    } catch (err) {
      setStatus({ message: err?.message || 'Failed to send email', type: 'error' });
    } finally {
      setIsProcessing(false);
    }
  };
  
  /**
   * Skip email step and continue
   */
  const skipEmail = () => {
    handleContinue();
  };
  
  /**
   * Navigate to return URL
   */
  const handleContinue = () => {
    window.location.href = returnTo;
  };
  
  // Calculate short address early so it's available in early returns
  const shortAddress = address ? `${address.slice(0, 6)}...${address.slice(-4)}` : '';
  
  // Loading state - only show during initial mount
  if (!isMounted) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-2 border-muted-foreground/30 border-t-primary rounded-full animate-spin mx-auto" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }
  
  // Show loading while checking GitHub auth
  if (githubUserLoading) {
    return (
      <div className="max-w-lg mx-auto px-6 py-16 space-y-8">
        <header className="text-center space-y-3">
          <h1 className="font-instrument-serif text-4xl text-foreground">Sign in</h1>
          <p className="text-sm text-muted-foreground">Checking your account...</p>
        </header>
        <div className={`${cardClasses} text-center py-8`}>
          <div className="w-10 h-10 border-2 border-muted-foreground/30 border-t-primary rounded-full animate-spin mx-auto" />
        </div>
      </div>
    );
  }
  
  // Show welcome back state when user has all three (GitHub + wallet + email)
  // No animations - just static content with spinner until redirect
  if (githubUser && showWelcomeBack && hasLinkedWallet && hasVerifiedEmail) {
    return (
      <div className="max-w-lg mx-auto px-6 py-16 space-y-8">
        <header className="text-center space-y-3">
          <h1 className="font-instrument-serif text-4xl text-foreground">Welcome back</h1>
          <p className="text-sm text-muted-foreground">Your account is ready for bounty payouts</p>
        </header>
        
        <div className={cardClasses}>
          <div className="text-center space-y-5">
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto">
              <CheckCircleIcon size={32} className="text-emerald-600" />
            </div>
            
            {/* Account summary */}
            <div className="rounded-xl border border-border/50 bg-secondary/30 p-4 text-left space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">GitHub</span>
                <span className="text-sm font-medium text-foreground">@{githubUser.githubUsername}</span>
              </div>
              <div className="border-t border-border/40" />
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Wallet</span>
                <span className="text-sm font-mono text-foreground">{shortAddress || 'Linked'}</span>
              </div>
              <div className="border-t border-border/40" />
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Email</span>
                <span className="text-sm text-foreground">{userEmail}</span>
              </div>
            </div>
            
            {/* Redirecting indicator */}
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <div className="w-4 h-4 border-2 border-muted-foreground/30 border-t-primary rounded-full animate-spin" />
              <span>Redirecting to bounties...</span>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  // Show checking state for logged-in users while loading profile
  if (githubUser && checkingProfile) {
    return (
      <div className="max-w-lg mx-auto px-6 py-16 space-y-8">
        <header className="text-center space-y-3">
          <h1 className="font-instrument-serif text-4xl text-foreground">Welcome back</h1>
          <p className="text-sm text-muted-foreground">Loading your account...</p>
        </header>
        <div className={`${cardClasses} text-center py-12`}>
          <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-4">
            <CheckCircleIcon size={32} className="text-emerald-600" />
          </div>
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <div className="w-4 h-4 border-2 border-muted-foreground/30 border-t-primary rounded-full animate-spin" />
            <span>Loading your account...</span>
          </div>
        </div>
      </div>
    );
  }
  
  // Determine what to show
  // User is "fully set up" when they have a linked wallet (email is optional)
  const isFullySetUp = hasLinkedWallet;
  
  return (
    <div className="max-w-lg mx-auto px-6 py-16 space-y-8">
      {/* Header */}
      <header className="text-center space-y-3">
        <h1 className="font-instrument-serif text-4xl text-foreground">
          {!githubUser ? 'Sign in' : isFullySetUp ? 'You\'re all set' : 'Complete setup'}
        </h1>
        <p className="text-sm text-muted-foreground max-w-sm mx-auto">
          {!githubUser 
            ? 'Sign in with GitHub to sponsor bounties or claim rewards.'
            : isFullySetUp
              ? 'Your account is ready to receive bounty payments.'
              : 'Connect your wallet to receive bounty payments.'}
        </p>
      </header>
      
      {/* Progress indicator */}
      {githubUser && !isFullySetUp && (
        <div className="flex items-center justify-center gap-2">
          <div className={`w-2 h-2 rounded-full ${currentStep >= 1 ? 'bg-primary' : 'bg-border'}`} />
          <div className={`w-8 h-px ${currentStep >= 2 ? 'bg-primary' : 'bg-border'}`} />
          <div className={`w-2 h-2 rounded-full ${currentStep >= 2 ? 'bg-primary' : 'bg-border'}`} />
          <div className={`w-8 h-px ${currentStep >= 3 ? 'bg-primary' : 'bg-border'}`} />
          <div className={`w-2 h-2 rounded-full ${currentStep >= 3 ? 'bg-primary' : 'bg-border'}`} />
        </div>
      )}
      
      {/* Status messages */}
      <StatusNotice status={status} />
      
      {/* Step 1: Sign in with GitHub */}
      {!githubUser && (
        <div className={cardClasses}>
          <div className="text-center space-y-5">
            <div className="w-14 h-14 rounded-full bg-foreground/5 flex items-center justify-center mx-auto">
              <GitHubIcon size={28} color="currentColor" className="text-foreground" />
            </div>
            
            <div className="space-y-2">
              <h2 className="text-lg font-medium text-foreground">Continue with GitHub</h2>
              <p className="text-sm text-muted-foreground">
                We use GitHub to verify your identity and track your contributions.
              </p>
            </div>
            
            <button
              onClick={authenticateGitHub}
              className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-foreground px-6 py-3 text-sm font-medium text-background transition-opacity hover:opacity-90"
            >
              <GitHubIcon size={18} color="currentColor" />
              Sign in with GitHub
            </button>
            
            <p className="text-xs text-muted-foreground">
              By signing in, you agree to our terms of service.
            </p>
          </div>
        </div>
      )}
      
      {/* Step 2: Connect Wallet */}
      {githubUser && !hasLinkedWallet && (
        <div className={cardClasses}>
          <div className="space-y-5">
            {/* Connected GitHub indicator */}
            <div className="flex items-center gap-3 p-3 rounded-xl bg-secondary/50">
              <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center">
                <CheckCircleIcon size={16} className="text-emerald-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground">Signed in as</p>
                <p className="text-sm font-medium text-foreground truncate">@{githubUser.githubUsername}</p>
              </div>
            </div>
            
            <div className="text-center space-y-2">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                <WalletIcon size={24} className="text-primary" />
              </div>
              <h2 className="text-lg font-medium text-foreground">Connect your wallet</h2>
              <p className="text-sm text-muted-foreground">
                Link a wallet to receive bounty payments. You'll sign a message to verify ownership—no gas required.
              </p>
            </div>
            
            <ConnectButton.Custom>
              {({ openConnectModal }) => (
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    if (openConnectModal) openConnectModal();
                  }}
                  disabled={!isMounted || isProcessing}
                  className="w-full inline-flex items-center justify-center rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isProcessing ? 'Connecting...' : 'Connect Wallet'}
                </button>
              )}
            </ConnectButton.Custom>
          </div>
        </div>
      )}
      
      {/* Step 3: All set (with optional email) */}
      {githubUser && hasLinkedWallet && (
        <div className={cardClasses}>
          <div className="text-center space-y-5">
            <div className="w-14 h-14 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto">
              <CheckCircleIcon size={28} className="text-emerald-600" />
            </div>
            
            <div className="space-y-2">
              <h2 className="text-lg font-medium text-foreground">You're all set!</h2>
              <p className="text-sm text-muted-foreground">
                Your account is ready to receive bounty payments.
              </p>
            </div>
            
            {/* Account summary */}
            <div className="rounded-xl border border-border/50 bg-secondary/30 p-4 text-left space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">GitHub</span>
                <span className="text-sm font-medium text-foreground">@{githubUser.githubUsername}</span>
              </div>
              <div className="border-t border-border/40" />
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Wallet</span>
                <span className="text-sm font-mono text-foreground">{shortAddress || 'Linked'}</span>
              </div>
              {/* Show email in summary if verified */}
              {hasVerifiedEmail && userEmail && (
                <>
                  <div className="border-t border-border/40" />
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Email</span>
                    <span className="text-sm text-foreground">{userEmail}</span>
                  </div>
                </>
              )}
            </div>
            
            {/* Optional email section - ONLY show when user does NOT have a verified email */}
            {!hasVerifiedEmail && !emailSent && (
              <div className="pt-4 border-t border-border/40">
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MailIcon size={14} />
                    <span>Get notified when you earn bounties</span>
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="flex-1 !h-10 !px-4 !py-0 !mb-0 !rounded-full !border !border-border !bg-background !text-sm placeholder:text-muted-foreground focus:!outline-none focus:!ring-2 focus:!ring-primary/20"
                    />
                    <button
                      onClick={handleSendEmailVerification}
                      disabled={!email || isProcessing}
                      className="px-4 py-2 rounded-full bg-secondary border border-border text-sm font-medium text-foreground hover:bg-secondary/80 transition-colors disabled:opacity-50"
                    >
                      Verify
                    </button>
                  </div>
                </div>
              </div>
            )}
            
            {emailSent && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-500/10 text-emerald-700 text-sm">
                <CheckCircleIcon size={16} />
                <span>Verification email sent! Check your inbox.</span>
              </div>
            )}
            
            <button
              onClick={handleContinue}
              className="w-full inline-flex items-center justify-center rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
            >
              Continue to App
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Sign In page wrapper with Suspense boundary
 */
export default function SignInPage() {
  return (
    <Suspense fallback={
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-2 border-muted-foreground/30 border-t-primary rounded-full animate-spin mx-auto" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    }>
      <SignInContent />
    </Suspense>
  );
}
