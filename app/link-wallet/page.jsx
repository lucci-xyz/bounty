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
  const [selectedNetwork, setSelectedNetwork] = useState('BASE_SEPOLIA');
  const [githubUser, setGithubUser] = useState(null);
  const [linked, setLinked] = useState(false);
  const [status, setStatus] = useState({ message: '', type: '' });
  const [returnTo, setReturnTo] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  const { address, isConnected, chain } = useAccount();
  const { data: walletClient } = useWalletClient();
  const { switchChain } = useSwitchChain();

  // Check if running locally - do this outside of state for immediate access
  const isLocal = process.env.NEXT_PUBLIC_ENV_TARGET === 'local';
  const networkConfig = NETWORKS[selectedNetwork];

  useEffect(() => {
    setIsMounted(true);
    
    console.log('Environment check:', {
      NEXT_PUBLIC_ENV_TARGET: process.env.NEXT_PUBLIC_ENV_TARGET,
      isLocal,
      githubUser
    });
    
    // Check for returnTo parameter
    const params = new URLSearchParams(window.location.search);
    const returnToParam = params.get('returnTo');
    if (returnToParam) {
      setReturnTo(returnToParam);
      console.log('Will redirect to:', returnToParam);
    }
    
    checkGitHubAuth();
  }, []);

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
    // Prevent double-clicking
    if (isProcessing) {
      console.log('Already processing, ignoring click');
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

      if (isLocal) {
        showStatus('✅ Local mode: Wallet connected for testing!', 'success');
        setIsProcessing(false);
        return;
      }

      showStatus('Checking network...', 'loading');

      // Switch network if needed
      if (chain?.id !== networkConfig.chainId) {
        showStatus(`Switching to ${networkConfig.name}...`, 'loading');
        try {
          await switchChain({ chainId: networkConfig.chainId });
          // Wait for network switch to complete
          await new Promise(resolve => setTimeout(resolve, 1500));
        } catch (switchError) {
          console.error('Network switch error:', switchError);
          throw new Error(`Failed to switch to ${networkConfig.name}. Please switch manually in your wallet.`);
        }
      }

      showStatus('Sign the message in your wallet...', 'loading');

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
        chainId: networkConfig.chainId,
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
      <div style={{ textAlign: 'center', marginBottom: '48px' }}>
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
        <h1 style={{ fontSize: '40px' }}>Link Your Wallet</h1>
        <p className="subtitle" style={{ fontSize: '16px', marginBottom: '0' }}>
          Connect GitHub and wallet to receive automatic bounty payments
        </p>
      </div>

      <div className="card" style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '20px' }}>
          <div style={{
            minWidth: '40px',
            height: '40px',
            borderRadius: '50%',
            background: githubUser ? 'var(--color-primary)' : 'var(--color-border)',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 600,
            fontSize: '14px',
            transition: 'all 0.2s',
            flexShrink: 0
          }}>
            {githubUser ? <CheckCircleIcon size={20} color="white" /> : <span>1</span>}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h3 style={{ marginBottom: '8px' }}>Authenticate with GitHub</h3>
            <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)', marginBottom: '16px', lineHeight: '1.5' }}>
              Verify your GitHub account to enable automatic bounty matching
            </p>
            <button
              className={githubUser ? "btn btn-secondary" : "btn btn-primary"}
              onClick={authenticateGitHub}
              disabled={githubUser !== null}
              style={{ width: '100%', margin: 0 }}
            >
              {githubUser ? (
                <>
                  <CheckCircleIcon size={18} />
                  Connected as {githubUser.githubUsername}
                </>
              ) : (
                <>
                  <GitHubIcon size={18} />
                  Connect GitHub
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      <div className="divider">
        <span>Then</span>
      </div>

      <div className="card" style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '20px' }}>
          <div style={{
            minWidth: '40px',
            height: '40px',
            borderRadius: '50%',
            background: linked ? 'var(--color-primary)' : (!githubUser ? 'var(--color-border)' : 'var(--color-primary-light)'),
            color: linked || !githubUser ? 'white' : 'var(--color-text-primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 600,
            fontSize: '14px',
            transition: 'all 0.2s',
            flexShrink: 0
          }}>
            {linked ? <CheckCircleIcon size={20} color="white" /> : <span>2</span>}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h3 style={{ marginBottom: '8px' }}>Connect Your Wallet</h3>
            <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)', marginBottom: '16px', lineHeight: '1.5' }}>
              Sign a message to securely link your wallet to your GitHub account
            </p>
            
            {!linked && (
              <div style={{ marginBottom: '16px' }}>
                <label style={{ marginBottom: '8px' }}>Select Network</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => {
                      console.log('Base Sepolia clicked');
                      setSelectedNetwork('BASE_SEPOLIA');
                    }}
                    disabled={(!githubUser && !isLocal) || isConnected}
                    style={{
                      flex: 1,
                      padding: '12px',
                      borderRadius: '8px',
                      border: selectedNetwork === 'BASE_SEPOLIA' ? '2px solid var(--color-primary)' : '1px solid var(--color-border)',
                      background: selectedNetwork === 'BASE_SEPOLIA' ? 'rgba(0, 130, 123, 0.1)' : 'var(--color-card)',
                      cursor: ((!githubUser && !isLocal) || isConnected) ? 'not-allowed' : 'pointer',
                      fontSize: '14px',
                      fontWeight: 600,
                      color: selectedNetwork === 'BASE_SEPOLIA' ? 'var(--color-primary)' : 'var(--color-text-primary)',
                      transition: 'all 0.2s',
                      opacity: ((!githubUser && !isLocal) || isConnected) ? 0.5 : 1
                    }}
                  >
                    Base Sepolia
                    <div style={{ fontSize: '12px', fontWeight: 400, marginTop: '4px', color: 'var(--color-text-secondary)' }}>USDC</div>
                  </button>
                  <button
                    onClick={() => {
                      console.log('Mezo Testnet clicked');
                      setSelectedNetwork('MEZO_TESTNET');
                    }}
                    disabled={(!githubUser && !isLocal) || isConnected}
                    style={{
                      flex: 1,
                      padding: '12px',
                      borderRadius: '8px',
                      border: selectedNetwork === 'MEZO_TESTNET' ? '2px solid var(--color-primary)' : '1px solid var(--color-border)',
                      background: selectedNetwork === 'MEZO_TESTNET' ? 'rgba(0, 130, 123, 0.1)' : 'var(--color-card)',
                      cursor: ((!githubUser && !isLocal) || isConnected) ? 'not-allowed' : 'pointer',
                      fontSize: '14px',
                      fontWeight: 600,
                      color: selectedNetwork === 'MEZO_TESTNET' ? 'var(--color-primary)' : 'var(--color-text-primary)',
                      transition: 'all 0.2s',
                      opacity: ((!githubUser && !isLocal) || isConnected) ? 0.5 : 1
                    }}
                  >
                    Mezo Testnet
                    <div style={{ fontSize: '12px', fontWeight: 400, marginTop: '4px', color: 'var(--color-text-secondary)' }}>MUSD</div>
                  </button>
                </div>
              </div>
            )}

            {!isConnected ? (
              <ConnectButton.Custom>
                {({ openConnectModal }) => (
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      console.log('Opening wallet modal...', { openConnectModal: typeof openConnectModal });
                      if (openConnectModal) {
                        openConnectModal();
                      } else {
                        console.error('openConnectModal is not available');
                      }
                    }}
                    disabled={(!githubUser && !isLocal) || !isMounted || !openConnectModal}
                    className="btn btn-primary"
                    style={{ width: '100%', margin: 0, opacity: ((!githubUser && !isLocal) || !isMounted) ? 0.5 : 1, cursor: (!isMounted || !openConnectModal) ? 'not-allowed' : 'pointer' }}
                  >
                    Link Wallet {isLocal && '(Local Mode)'}
                  </button>
                )}
              </ConnectButton.Custom>
            ) : linked ? (
              <button
                className="btn btn-secondary"
                disabled
                style={{ width: '100%', margin: 0 }}
              >
                <CheckCircleIcon size={18} />
                Wallet Linked
              </button>
            ) : (
              <>
                <button
                  className="btn btn-primary"
                  onClick={() => {
                    console.log('Linking wallet...');
                    linkWallet();
                  }}
                  disabled={(!githubUser && !isLocal) || isProcessing}
                  style={{ width: '100%', margin: 0, opacity: ((!githubUser && !isLocal) || isProcessing) ? 0.5 : 1, marginBottom: '12px', cursor: isProcessing ? 'not-allowed' : 'pointer' }}
                >
                  {isProcessing ? 'Processing...' : 'Sign & Link Wallet'}
                </button>

                <ConnectButton.Custom>
                  {({ openAccountModal, openChainModal }) => (
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          console.log('Change Wallet (link-wallet) clicked', { openAccountModal: typeof openAccountModal });
                          if (openAccountModal) {
                            openAccountModal();
                          }
                        }}
                        className="btn btn-secondary"
                        disabled={!isMounted || !openAccountModal || isProcessing}
                        style={{ flex: 1, margin: 0, fontSize: '14px', cursor: (!isMounted || !openAccountModal || isProcessing) ? 'not-allowed' : 'pointer' }}
                      >
                        Change Wallet
                      </button>
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          console.log('Switch Network (link-wallet) clicked', { openChainModal: typeof openChainModal });
                          if (openChainModal) {
                            openChainModal();
                          }
                        }}
                        className="btn btn-secondary"
                        disabled={!isMounted || !openChainModal || isProcessing}
                        style={{ flex: 1, margin: 0, fontSize: '14px', cursor: (!isMounted || !openChainModal || isProcessing) ? 'not-allowed' : 'pointer' }}
                      >
                        Switch Network
                      </button>
                    </div>
                  )}
                </ConnectButton.Custom>
              </>
            )}
          </div>
        </div>
      </div>

      {linked && (
        <div className="wallet-info">
          <div><strong>GitHub:</strong> {githubUser?.githubUsername}</div>
          <div><strong>Wallet:</strong> {address?.slice(0, 6)}...{address?.slice(-4)}</div>
          <div><strong>Network:</strong> {networkConfig.name}</div>
        </div>
      )}

      {status.message && (
        <div className={`status ${status.type}`}>
          {status.message}
        </div>
      )}
    </div>
  );
}
