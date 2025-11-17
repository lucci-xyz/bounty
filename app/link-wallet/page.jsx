'use client';

import { useState, useEffect } from 'react';
import { useAccount, useWalletClient, useSwitchChain } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { LinkIcon, GitHubIcon, CheckCircleIcon, AlertIcon } from '@/components/Icons';

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
  const [existingWallet, setExistingWallet] = useState(null);
  const [userExists, setUserExists] = useState(false);
  const [linked, setLinked] = useState(false);
  const [status, setStatus] = useState({ message: '', type: '' });
  const [returnTo, setReturnTo] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [useLocalMode, setUseLocalMode] = useState(false);
  const [isChangingWallet, setIsChangingWallet] = useState(false);
  const [showAccountPrompt, setShowAccountPrompt] = useState(false);
  const [walletLinkedNoAccount, setWalletLinkedNoAccount] = useState(false);

  const { address, isConnected, chain } = useAccount();
  const { data: walletClient } = useWalletClient();

  // Check if running locally or with dummy data - do this outside of state for immediate access
  const isLocal = process.env.NEXT_PUBLIC_ENV_TARGET === 'local';
  const useDummyData = process.env.NEXT_PUBLIC_USE_DUMMY_DATA === 'true';

  useEffect(() => {
    setIsMounted(true);
    
    const params = new URLSearchParams(window.location.search);
    const returnToParam = params.get('returnTo');
    const actionParam = params.get('action');
    
    if (returnToParam) {
      setReturnTo(returnToParam);
    }
    
    if (actionParam === 'change') {
      setIsChangingWallet(true);
    }
    
    // In local mode or with dummy data enabled, use dummy GitHub user
    if (isLocal || useDummyData) {
      setUseLocalMode(true);
      setGithubUser({
        githubId: 123456789,
        githubUsername: 'local-dev',
        avatarUrl: null
      });
      setUserExists(false);
    } else {
      checkGitHubAuthAndWallet();
    }
  }, []);

  // Auto-link wallet when both GitHub and wallet are connected, but only if no existing wallet
  useEffect(() => {
    if (githubUser && isConnected && address && walletClient && !linked && !isProcessing && !existingWallet) {
      linkWallet();
    }
  }, [githubUser, isConnected, address, walletClient, linked, isProcessing, existingWallet]);

  const showStatus = (message, type) => {
    setStatus({ message, type });
  };

  const checkGitHubAuthAndWallet = async () => {
    try {
      // Check GitHub authentication
      const authRes = await fetch('/api/oauth/user', {
        credentials: 'include'
      });

      if (!authRes.ok) {
        // No GitHub auth, user needs to authenticate
        return;
      }

      const user = await authRes.json();
      setGithubUser(user);

      // Check if user exists in database and if they have a wallet
      const profileRes = await fetch('/api/user/profile', {
        credentials: 'include'
      });

      if (profileRes.ok) {
        const { user: dbUser, wallet } = await profileRes.json();
        
        if (dbUser) {
          setUserExists(true);
        }

        if (wallet) {
          // Case 1: User exists AND has wallet linked
          setExistingWallet(wallet);
          setLinked(true);
          showStatus('✅ Wallet already linked! Redirecting...', 'success');
          
          // Redirect to their original destination
          setTimeout(() => {
            if (returnTo) {
              window.location.href = returnTo;
            } else {
              window.location.href = '/';
            }
          }, 1500);
        } else {
          // Case 2: User exists but no wallet
          // or Case 3: No user exists
          showStatus('GitHub authenticated! Please connect your wallet.', 'success');
        }
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
        setWalletLinkedNoAccount(true);
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

      // Case 2: User exists but had no wallet - now linked
      if (userExists) {
        setLinked(true);
        showStatus('✅ Wallet linked successfully! Redirecting...', 'success');
        
        setTimeout(() => {
          if (returnTo) {
            window.location.href = returnTo;
          } else {
            window.location.href = '/';
          }
        }, 2000);
      } else {
        // Case 3: No user exists - show account creation prompt
        setWalletLinkedNoAccount(true);
        showStatus('✅ Wallet connected!', 'success');
        setShowAccountPrompt(true);
        setIsProcessing(false);
      }
    } catch (error) {
      console.error(error);
      showStatus(error.message || 'An error occurred', 'error');
      setIsProcessing(false);
    }
  };

  const createAccount = async () => {
    try {
      setIsProcessing(true);
      showStatus('Creating your account...', 'loading');

      const res = await fetch('/api/user/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          preferences: {}
        })
      });

      if (!res.ok) {
        throw new Error('Failed to create account');
      }

      setLinked(true);
      showStatus('✅ Account created! Redirecting...', 'success');
      
      setTimeout(() => {
        if (returnTo) {
          window.location.href = returnTo;
        } else {
          window.location.href = '/';
        }
      }, 2000);
    } catch (error) {
      console.error(error);
      showStatus(error.message || 'Failed to create account', 'error');
      setIsProcessing(false);
    }
  };

  const skipAccountCreation = () => {
    showStatus('✅ Wallet linked for this session! Redirecting...', 'success');
    setTimeout(() => {
      if (returnTo) {
        window.location.href = returnTo;
      } else {
        window.location.href = '/';
      }
    }, 1500);
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
          {isChangingWallet ? 'Change Your Wallet' : 'Link Your Wallet'}
        </h1>
        <p className="subtitle" style={{ fontSize: 'clamp(15px, 2.5vw, 16px)', marginTop: '8px' }}>
          {isChangingWallet 
            ? 'Link a new wallet to receive bounty payments' 
            : 'Connect your GitHub and wallet to receive automatic bounty payments'
          }
        </p>
      </div>

      {/* Warning banner for changing wallet */}
      {isChangingWallet && (
        <div className="animate-fade-in-up delay-100" style={{
          background: 'rgba(255, 180, 0, 0.08)',
          border: '1px solid rgba(255, 180, 0, 0.3)',
          borderRadius: '8px',
          padding: '16px',
          marginBottom: '24px',
          display: 'flex',
          gap: '12px'
        }}>
          <div style={{ flexShrink: 0, marginTop: '2px' }}>
            <AlertIcon size={20} color="var(--color-warning)" />
          </div>
          <div>
            <p style={{
              fontSize: '14px',
              color: 'var(--color-text-primary)',
              marginBottom: '8px',
              fontWeight: '600'
            }}>
              ⚠️ Important: Changing Your Wallet
            </p>
            <p style={{
              fontSize: '13px',
              color: 'var(--color-text-secondary)',
              lineHeight: '1.6',
              margin: 0
            }}>
              The new wallet will be used for <strong>all active and future bounty payments</strong>. 
              Make sure you have access to the new wallet before proceeding.
            </p>
          </div>
        </div>
      )}

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
      ) : showAccountPrompt ? (
        <div className="card animate-fade-in-up" style={{ textAlign: 'center' }}>
          <div style={{
            width: '80px',
            height: '80px',
            borderRadius: '50%',
            background: 'rgba(131, 238, 232, 0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 20px'
          }}>
            <CheckCircleIcon size={48} color="var(--color-primary)" />
          </div>
          <h3 style={{ marginBottom: '12px', fontFamily: "'Space Grotesk', sans-serif" }}>
            Wallet Connected!
          </h3>
          <p style={{ 
            fontSize: '14px', 
            color: 'var(--color-text-secondary)', 
            marginBottom: '24px',
            lineHeight: '1.6'
          }}>
            Create an account so you don't have to do this again next time?
          </p>
          
          <div className="wallet-info" style={{ 
            margin: '24px 0', 
            textAlign: 'left',
            background: 'var(--color-background-secondary)',
            padding: '16px',
            borderRadius: '8px'
          }}>
            <div style={{ fontSize: '13px', marginBottom: '8px' }}>
              <strong>GitHub:</strong> @{githubUser.githubUsername}
            </div>
            <div style={{ fontSize: '13px' }}>
              <strong>Wallet:</strong> {address.slice(0, 10)}...{address.slice(-8)}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <button
              onClick={createAccount}
              disabled={isProcessing}
              className="btn btn-primary btn-full"
              style={{
                background: isProcessing ? 'var(--color-text-secondary)' : 'var(--color-primary)',
                cursor: isProcessing ? 'not-allowed' : 'pointer'
              }}
            >
              {isProcessing ? 'Creating Account...' : 'Yes, Create Account'}
            </button>
            <button
              onClick={skipAccountCreation}
              disabled={isProcessing}
              style={{
                padding: '12px',
                borderRadius: '8px',
                border: '2px solid var(--color-border)',
                background: 'white',
                color: 'var(--color-text-secondary)',
                fontSize: '14px',
                fontWeight: '600',
                cursor: isProcessing ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                if (!isProcessing) {
                  e.currentTarget.style.background = 'var(--color-background-secondary)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isProcessing) {
                  e.currentTarget.style.background = 'white';
                }
              }}
            >
              No, Just This Once
            </button>
          </div>
        </div>
      ) : linked || existingWallet ? (
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
          <h3 style={{ marginBottom: '12px', color: 'var(--color-primary)', fontFamily: "'Space Grotesk', sans-serif" }}>
            Wallet Successfully Linked!
          </h3>
          <div className="wallet-info" style={{ margin: '20px 0', textAlign: 'left' }}>
            <div><strong>GitHub:</strong> @{githubUser.githubUsername}</div>
            <div><strong>Wallet:</strong> {address ? `${address.slice(0, 10)}...${address.slice(-8)}` : `${existingWallet?.walletAddress.slice(0, 10)}...${existingWallet?.walletAddress.slice(-8)}`}</div>
            {chain && <div><strong>Network:</strong> {chain?.name}</div>}
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

      {status.message && !linked && !showAccountPrompt && !existingWallet && (
        <div className={`status ${status.type}`} style={{ marginTop: '20px' }}>
          {status.message}
        </div>
      )}
    </div>
  );
}
