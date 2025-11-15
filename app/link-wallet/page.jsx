'use client';

import { useState, useEffect } from 'react';
import { useAccount, useWalletClient, useSwitchChain } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { NETWORKS } from '@/config/networks';
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
  const [linked, setLinked] = useState(false);
  const [status, setStatus] = useState({ message: '', type: '' });
  const [returnTo, setReturnTo] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [useLocalMode, setUseLocalMode] = useState(false);

  const { address, isConnected, chain } = useAccount();
  const { data: walletClient } = useWalletClient();

  // Check if running locally or with dummy data - do this outside of state for immediate access
  const isLocal = process.env.NEXT_PUBLIC_ENV_TARGET === 'local';
  const useDummyData = process.env.NEXT_PUBLIC_USE_DUMMY_DATA === 'true';

  useEffect(() => {
    setIsMounted(true);
    
    const params = new URLSearchParams(window.location.search);
    const returnToParam = params.get('returnTo');
    if (returnToParam) {
      setReturnTo(returnToParam);
    }
    
    // In local mode or with dummy data enabled, use dummy GitHub user
    if (isLocal || useDummyData) {
      setUseLocalMode(true);
      setGithubUser({
        githubId: 123456789,
        githubUsername: 'local-dev',
        avatarUrl: null
      });
    } else {
      checkGitHubAuth();
    }
  }, []);

  // Auto-link wallet when both GitHub and wallet are connected
  useEffect(() => {
    if (githubUser && isConnected && address && walletClient && !linked && !isProcessing) {
      linkWallet();
    }
  }, [githubUser, isConnected, address, walletClient, linked, isProcessing]);

  const showStatus = (message, type) => {
    setStatus({ message, type });
  };

  const checkGitHubAuth = async () => {
    try {
      const res = await fetch('/api/oauth/user', {
        credentials: 'include'
      });

      if (res.ok) {
        const user = await res.json();
        setGithubUser(user);
        showStatus('GitHub authenticated!', 'success');
      }
    } catch (error) {
      console.error('Auth check error:', error);
    }
  };

  const authenticateGitHub = () => {
    const returnUrl = window.location.pathname + window.location.search;
    const authUrl = `/api/oauth/github?returnTo=${encodeURIComponent(returnUrl)}`;
    window.location.href = authUrl;
  };

  const linkWallet = async () => {
    if (isProcessing) {
      return;
    }
    
    try {
      setIsProcessing(true);
      
      if (!githubUser && !isLocal) {
        throw new Error('Please authenticate with GitHub first');
      }

      if (!isConnected || !address) {
        throw new Error('Please connect your wallet first');
      }

      if (!walletClient) {
        throw new Error('Wallet client not available. Please reconnect your wallet.');
      }

      if (isLocal || useLocalMode) {
        showStatus('✅ Local mode: Wallet linked for testing!', 'success');
        setLinked(true);
        setIsProcessing(false);
        
        // Simulate redirect
        setTimeout(() => {
          if (returnTo) {
            window.location.href = returnTo;
          } else {
            window.location.href = '/';
          }
        }, 2000);
        return;
      }

      showStatus('Please sign the message in your wallet...', 'loading');

      const nonceRes = await fetch('/api/nonce', {
        credentials: 'include'
      });
      const { nonce } = await nonceRes.json();

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

      showStatus('Verifying signature...', 'loading');

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

      showStatus('Linking wallet...', 'loading');

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
        throw new Error('Failed to link wallet');
      }

      setLinked(true);
      showStatus('✅ Wallet linked successfully! Redirecting...', 'success');
      
      // Redirect back to the page they came from, or to GitHub profile
      setTimeout(() => {
        if (returnTo) {
          window.location.href = returnTo;
        } else if (githubUser?.githubUsername) {
          window.location.href = `https://github.com/${githubUser.githubUsername}`;
        }
      }, 2000);
    } catch (error) {
      console.error(error);
      showStatus(error.message || 'An error occurred', 'error');
      setIsProcessing(false);
    }
  };

  // Don't render wallet controls until mounted (prevents hydration mismatch)
  if (!isMounted) {
    return (
      <div className="container" style={{ maxWidth: '600px', textAlign: 'center', padding: '100px 20px' }}>
        <div style={{ fontSize: '16px', color: 'var(--color-text-secondary)' }}>Loading...</div>
      </div>
    );
  }

  return (
    <div className="container" style={{ maxWidth: '600px' }}>
      <div className="animate-fade-in-up" style={{ textAlign: 'center', marginBottom: '48px' }}>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          gap: '12px',
          marginBottom: '16px'
        }}>
          <div style={{
            width: '56px',
            height: '56px',
            borderRadius: '16px',
            background: 'rgba(131, 238, 232, 0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <LinkIcon size={32} color="var(--color-primary)" />
          </div>
        </div>
        <h1 style={{ 
          fontSize: 'clamp(32px, 6vw, 40px)',
          fontFamily: "'Space Grotesk', sans-serif",
          letterSpacing: '-0.02em'
        }}>
          Link Your Wallet
        </h1>
        <p className="subtitle" style={{ fontSize: 'clamp(15px, 2.5vw, 16px)', marginTop: '8px' }}>
          Connect your GitHub and wallet to receive automatic bounty payments
        </p>
      </div>

      {!githubUser ? (
        <div className="card animate-fade-in-up delay-100">
          <h3 style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{
              width: '24px',
              height: '24px',
              borderRadius: '50%',
              background: 'var(--color-primary-light)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '12px',
              fontWeight: 600
            }}>1</span>
            Authenticate with GitHub
          </h3>
          <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)', marginBottom: '20px' }}>
            First, connect your GitHub account to verify your identity
          </p>
          
          {isLocal ? (
            <div>
              <button
                className="btn btn-primary btn-full"
                onClick={() => {
                  setUseLocalMode(true);
                  setGithubUser({
                    githubId: 123456789,
                    githubUsername: 'local-dev',
                    avatarUrl: null
                  });
                  showStatus('Local mode: GitHub authenticated', 'success');
                }}
              >
                <GitHubIcon size={18} />
                Use Local Mode (Testing)
              </button>
              <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginTop: '12px' }}>
                Running in local environment - OAuth bypass enabled
              </p>
            </div>
          ) : (
            <button
              className="btn btn-primary btn-full"
              onClick={authenticateGitHub}
            >
              <GitHubIcon size={18} />
              Connect GitHub
            </button>
          )}
        </div>
      ) : !isConnected ? (
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
              background: 'var(--color-primary-light)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '12px',
              fontWeight: 600
            }}>2</span>
            Connect Your Wallet
          </h3>
          <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)', marginBottom: '20px' }}>
            You'll be asked to sign a message to prove wallet ownership (no gas fees)
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
      ) : linked ? (
        <div className="card animate-fade-in-up" style={{ textAlign: 'center' }}>
          <div style={{
            width: '80px',
            height: '80px',
            borderRadius: '50%',
            background: 'rgba(34, 197, 94, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 20px'
          }}>
            <CheckCircleIcon size={48} color="#22C55E" />
          </div>
          <h3 style={{ marginBottom: '12px', color: '#22C55E' }}>Wallet Successfully Linked!</h3>
          <div className="wallet-info" style={{ margin: '20px 0', textAlign: 'left' }}>
            <div><strong>GitHub:</strong> @{githubUser.githubUsername}</div>
            <div><strong>Wallet:</strong> {address.slice(0, 10)}...{address.slice(-8)}</div>
            <div><strong>Network:</strong> {chain?.name}</div>
          </div>
          <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)' }}>
            Redirecting you back...
          </p>
        </div>
      ) : (
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
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
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
              <div style={{ fontSize: '14px', fontWeight: 600 }}>Wallet Connected</div>
              <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>{address.slice(0, 6)}...{address.slice(-4)}</div>
            </div>
          </div>
          
          <div style={{
            padding: '16px',
            borderRadius: '8px',
            background: 'rgba(131, 238, 232, 0.1)',
            border: '1px solid rgba(131, 238, 232, 0.3)',
            marginBottom: '20px',
            fontSize: '14px',
            lineHeight: '1.6'
          }}>
            <strong>🔐 One more step:</strong> Sign a message to prove you own this wallet. This is free and doesn't require any transaction.
          </div>
          
          <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginBottom: '16px', textAlign: 'center' }}>
            {isProcessing ? '⏳ Waiting for signature...' : 'Click below to sign and complete linking'}
          </div>
        </div>
      )}

      {status.message && !linked && (
        <div className={`status ${status.type}`} style={{ marginTop: '20px' }}>
          {status.message}
        </div>
      )}
    </div>
  );
}
