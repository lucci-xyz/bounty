'use client';

import { useState, useEffect } from 'react';
import { useAccount, useWalletClient } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { LinkIcon, GitHubIcon, CheckCircleIcon } from '@/components/Icons';

function createSiweMessage({ domain, address, statement, uri, version, chainId, nonce }) {
  const message = [
    `${domain} wants you to sign in with your Ethereum account:`,
    address,
    '',
    statement,
    '',
    `URI: ${uri}`,
    `Version: ${version}`,
    `Chain ID: ${chainId}`,
    `Nonce: ${nonce}`,
    `Issued At: ${new Date().toISOString()}`
  ].join('\n');

  return message;
}

export default function LinkWallet() {
  const [githubUser, setGithubUser] = useState(null);
  const [hasExistingAccount, setHasExistingAccount] = useState(false);
  const [profileCreated, setProfileCreated] = useState(false);
  const [status, setStatus] = useState({ message: '', type: '' });
  const [isProcessing, setIsProcessing] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [checkingAccount, setCheckingAccount] = useState(false);

  const { address, isConnected, chain } = useAccount();
  const { data: walletClient } = useWalletClient();

  const isLocal = process.env.NEXT_PUBLIC_ENV_TARGET === 'local';
  const useDummyData = process.env.NEXT_PUBLIC_USE_DUMMY_DATA === 'true';

  useEffect(() => {
    setIsMounted(true);
    
    if (isLocal || useDummyData) {
      setGithubUser({
        githubId: 123456789,
        githubUsername: 'local-dev',
        avatarUrl: null
      });
      setHasExistingAccount(false);
    } else {
      checkGitHubAuth();
    }
  }, []);

  // Auto-link wallet when both conditions met and user doesn't have account
  useEffect(() => {
    if (githubUser && !hasExistingAccount && isConnected && address && walletClient && !profileCreated && !isProcessing) {
      createProfileWithWallet();
    }
  }, [githubUser, hasExistingAccount, isConnected, address, walletClient, profileCreated, isProcessing]);

  const checkGitHubAuth = async () => {
    try {
      const authRes = await fetch('/api/oauth/user', {
        credentials: 'include'
      });

      if (!authRes.ok) {
        return;
      }

      const user = await authRes.json();
      setGithubUser(user);
      
      // Check if user already has an account
      setCheckingAccount(true);
      const profileRes = await fetch('/api/user/profile', {
        credentials: 'include'
      });

      if (profileRes.ok) {
        const { user: dbUser } = await profileRes.json();
        
        // User has an existing account
        if (dbUser) {
          setHasExistingAccount(true);
        }
      }
      setCheckingAccount(false);
    } catch (error) {
      console.error('Auth check error:', error);
      setCheckingAccount(false);
    }
  };

  const authenticateGitHub = () => {
    const returnUrl = window.location.pathname + window.location.search;
    const authUrl = `/api/oauth/github?returnTo=${encodeURIComponent(returnUrl)}`;
    window.location.href = authUrl;
  };

  const createProfileWithWallet = async () => {
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

      // Get nonce
      const nonceRes = await fetch('/api/nonce', {
        credentials: 'include'
      });
      const { nonce } = await nonceRes.json();

      // Create and sign message
      const messageText = createSiweMessage({
        domain: window.location.host,
        address: address,
        statement: 'Link your wallet to receive BountyPay payments.',
        uri: window.location.origin,
        version: '1',
        chainId: chain?.id || 1,
        nonce
      });

      const signature = await walletClient.signMessage({
        message: messageText
      });

      setStatus({ message: 'Verifying signature...', type: 'loading' });

      // Verify signature
      const verifyRes = await fetch('/api/verify-wallet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          message: messageText,
          signature
        })
      });

      if (!verifyRes.ok) {
        throw new Error('Signature verification failed');
      }

      setStatus({ message: 'Creating your profile...', type: 'loading' });

      // Link wallet (this creates the user if they don't exist)
      const linkRes = await fetch('/api/wallet/link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          githubId: githubUser.githubId,
          githubUsername: githubUser.githubUsername,
          walletAddress: address
        })
      });

      if (!linkRes.ok) {
        throw new Error('Failed to create profile');
      }

      setProfileCreated(true);
      setStatus({ message: '', type: '' });
      
    } catch (error) {
      console.error(error);
      setStatus({ message: error.message || 'An error occurred', type: 'error' });
      setIsProcessing(false);
    }
  };

  if (!isMounted) {
    return (
      <div className="container" style={{ maxWidth: '600px', textAlign: 'center', padding: '100px 20px' }}>
        <div style={{ fontSize: '16px', color: 'var(--color-text-secondary)' }}>Loading...</div>
      </div>
    );
  }

  return (
    <div className="container" style={{ maxWidth: '600px', padding: '60px 20px' }}>
      <div className="animate-fade-in-up" style={{ textAlign: 'center', marginBottom: '48px' }}>
        <div style={{
          width: '56px',
          height: '56px',
          borderRadius: '16px',
          background: 'rgba(131, 238, 232, 0.15)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 16px'
        }}>
          <LinkIcon size={32} color="var(--color-primary)" />
        </div>
        <h1 style={{ 
          fontSize: 'clamp(28px, 6vw, 36px)',
          fontFamily: "'Space Grotesk', sans-serif",
          letterSpacing: '-0.02em',
          marginBottom: '8px'
        }}>
          Claim Bounties
        </h1>
        <p style={{ fontSize: '15px', color: 'var(--color-text-secondary)' }}>
          Link your account to receive automatic payments for completed bounties
        </p>
      </div>

      {/* Step 1: GitHub Authentication */}
      {!githubUser ? (
        <div className="card animate-fade-in-up delay-100">
          <h3 style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{
              width: '24px',
              height: '24px',
              borderRadius: '50%',
              background: 'var(--color-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '12px',
              fontWeight: 600,
              color: 'white'
            }}>1</span>
            Connect GitHub
          </h3>
          <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)', marginBottom: '20px' }}>
            First, authenticate with GitHub to verify your identity
          </p>
          
          <button
            className="btn btn-primary btn-full"
            onClick={authenticateGitHub}
          >
            <GitHubIcon size={18} />
            Connect with GitHub
          </button>
        </div>
      ) : checkingAccount ? (
        // Checking if user has account
        <div className="card animate-fade-in-up" style={{ textAlign: 'center', padding: '40px 20px' }}>
          <div style={{ fontSize: '14px', color: 'var(--color-text-secondary)' }}>
            Checking your account...
          </div>
        </div>
      ) : hasExistingAccount ? (
        // User already has an account
        <div className="card animate-fade-in-up" style={{ textAlign: 'center' }}>
          <div style={{
            width: '80px',
            height: '80px',
            borderRadius: '50%',
            background: 'rgba(0, 130, 123, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 20px'
          }}>
            <CheckCircleIcon size={48} color="var(--color-primary)" />
          </div>
          <h3 style={{ 
            marginBottom: '12px', 
            color: 'var(--color-primary)', 
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: '22px'
          }}>
            You're All Set! ✨
          </h3>
          <p style={{ 
            fontSize: '15px', 
            color: 'var(--color-text-secondary)', 
            marginBottom: '20px',
            lineHeight: '1.6'
          }}>
            Your account is already set up and you're eligible to claim bounties.
          </p>
          
          <div style={{ 
            background: 'var(--color-background-secondary)',
            padding: '16px',
            borderRadius: '8px',
            marginBottom: '24px',
            textAlign: 'left'
          }}>
            <div style={{ fontSize: '13px', marginBottom: '8px' }}>
              <strong>GitHub:</strong> @{githubUser.githubUsername}
            </div>
            <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>
              ✅ Profile verified and ready for bounty payments
            </div>
          </div>

          <button
            onClick={() => window.close()}
            className="btn btn-primary btn-full"
          >
            Continue
          </button>
        </div>
      ) : profileCreated ? (
        // Profile successfully created
        <div className="card animate-fade-in-up" style={{ textAlign: 'center' }}>
          <div style={{
            width: '80px',
            height: '80px',
            borderRadius: '50%',
            background: 'rgba(0, 130, 123, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 20px'
          }}>
            <CheckCircleIcon size={48} color="var(--color-primary)" />
          </div>
          <h3 style={{ 
            marginBottom: '12px', 
            color: 'var(--color-primary)', 
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: '22px'
          }}>
            Profile Created! 🎉
          </h3>
          <p style={{ 
            fontSize: '15px', 
            color: 'var(--color-text-secondary)', 
            marginBottom: '20px',
            lineHeight: '1.6'
          }}>
            Your profile has been created and you're now eligible to claim bounties.
          </p>
          
          <div style={{ 
            background: 'var(--color-background-secondary)',
            padding: '16px',
            borderRadius: '8px',
            marginBottom: '24px',
            textAlign: 'left'
          }}>
            <div style={{ fontSize: '13px', marginBottom: '8px' }}>
              <strong>GitHub:</strong> @{githubUser.githubUsername}
            </div>
            <div style={{ fontSize: '13px', marginBottom: '8px' }}>
              <strong>Wallet:</strong> {address.slice(0, 10)}...{address.slice(-8)}
            </div>
            <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>
              ✅ Ready to receive bounty payments
            </div>
          </div>

          <button
            onClick={() => window.close()}
            className="btn btn-primary btn-full"
          >
            Continue
          </button>
        </div>
      ) : !isConnected ? (
        // Step 2: Connect Wallet (only for new users)
        <div className="card animate-fade-in-up delay-100">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <div style={{
              width: '24px',
              height: '24px',
              borderRadius: '50%',
              background: 'var(--color-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <CheckCircleIcon size={16} color="white" />
            </div>
            <div>
              <div style={{ fontSize: '14px', fontWeight: 600 }}>GitHub Connected</div>
              <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>@{githubUser.githubUsername}</div>
            </div>
          </div>
          
          <div className="divider" style={{ margin: '20px 0' }}>
            <span>Next</span>
          </div>
          
          <h3 style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{
              width: '24px',
              height: '24px',
              borderRadius: '50%',
              background: 'var(--color-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '12px',
              fontWeight: 600,
              color: 'white'
            }}>2</span>
            Connect Your Wallet
          </h3>
          <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)', marginBottom: '20px' }}>
            Connect a wallet to receive bounty payments. You'll sign a message to verify ownership (no fees).
          </p>
          
          <ConnectButton.Custom>
            {({ openConnectModal }) => (
              <button
                onClick={(e) => {
                  e.preventDefault();
                  if (openConnectModal) openConnectModal();
                }}
                disabled={!isMounted || !openConnectModal}
                className="btn btn-primary btn-full"
              >
                Connect Wallet
              </button>
            )}
          </ConnectButton.Custom>
        </div>
      ) : (
        // Wallet connected, processing...
        <div className="card animate-fade-in-up" style={{ textAlign: 'center' }}>
          <div style={{ padding: '40px 20px' }}>
            <div style={{ fontSize: '32px', marginBottom: '16px' }}>⏳</div>
            <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)' }}>
              {status.message || 'Setting up your profile...'}
            </p>
          </div>
        </div>
      )}

      {status.type === 'error' && (
        <div className="status error" style={{ marginTop: '20px' }}>
          {status.message}
        </div>
      )}
    </div>
  );
}
