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

  const { address, isConnected, chain } = useAccount();
  const { data: walletClient } = useWalletClient();
  const { switchChain } = useSwitchChain();

  // Check if running locally - do this outside of state for immediate access
  const isLocal = process.env.NEXT_PUBLIC_ENV_TARGET === 'local';
  const networkConfig = NETWORKS[selectedNetwork];

  useEffect(() => {
    console.log('Environment check:', {
      NEXT_PUBLIC_ENV_TARGET: process.env.NEXT_PUBLIC_ENV_TARGET,
      isLocal,
      githubUser
    });
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
    try {
      if (!githubUser && !isLocal) {
        throw new Error('Please authenticate with GitHub first');
      }

      if (!isConnected || !address) {
        throw new Error('Please connect your wallet first');
      }

      if (!walletClient) {
        throw new Error('Wallet client not available');
      }

      if (isLocal) {
        showStatus('✅ Local mode: Wallet connected for testing!', 'success');
        return;
      }

      showStatus('Checking network...', 'loading');

      // Switch network if needed
      if (chain?.id !== networkConfig.chainId) {
        showStatus(`Switching to ${networkConfig.name}...`, 'loading');
        await switchChain({ chainId: networkConfig.chainId });
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
      showStatus('✅ Wallet linked successfully! You can now receive bounty payments.', 'success');
    } catch (error) {
      console.error(error);
      showStatus(error.message || 'An error occurred', 'error');
    }
  };

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
                    onClick={() => {
                      console.log('Opening wallet modal...');
                      openConnectModal();
                    }}
                    disabled={!githubUser && !isLocal}
                    className="btn btn-primary"
                    style={{ width: '100%', margin: 0, opacity: (!githubUser && !isLocal) ? 0.5 : 1 }}
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
                  disabled={!githubUser && !isLocal}
                  style={{ width: '100%', margin: 0, opacity: (!githubUser && !isLocal) ? 0.5 : 1, marginBottom: '12px' }}
                >
                  Sign & Link Wallet
                </button>

                <ConnectButton.Custom>
                  {({ openAccountModal, openChainModal }) => (
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        onClick={openAccountModal}
                        className="btn btn-secondary"
                        style={{ flex: 1, margin: 0, fontSize: '14px' }}
                      >
                        Change Wallet
                      </button>
                      <button
                        onClick={openChainModal}
                        className="btn btn-secondary"
                        style={{ flex: 1, margin: 0, fontSize: '14px' }}
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
