import { useState, useEffect } from 'react';
import { ethers } from 'ethers';

const CHAIN_ID = 84532;

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

function LinkWallet() {
  const [githubUser, setGithubUser] = useState(null);
  const [walletAddress, setWalletAddress] = useState('');
  const [linked, setLinked] = useState(false);
  const [status, setStatus] = useState({ message: '', type: '' });

  useEffect(() => {
    checkGitHubAuth();
  }, []);

  const showStatus = (message, type) => {
    setStatus({ message, type });
  };

  const checkGitHubAuth = async () => {
    try {
      const res = await fetch('/oauth/user', {
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
    const authUrl = `/oauth/github?returnTo=${encodeURIComponent(returnUrl)}`;
    window.location.href = authUrl;
  };

  const connectWallet = async () => {
    try {
      if (!githubUser) {
        throw new Error('Please authenticate with GitHub first');
      }

      showStatus('Connecting wallet...', 'loading');

      if (!window.ethereum) {
        throw new Error('Please install MetaMask or enable Brave Wallet');
      }

      const provider = new ethers.BrowserProvider(window.ethereum);
      const accounts = await provider.send('eth_requestAccounts', []);
      const address = ethers.getAddress(accounts[0]);

      const network = await provider.getNetwork();
      if (Number(network.chainId) !== CHAIN_ID) {
        showStatus('Please switch to Base Sepolia network', 'error');
        return;
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
        chainId: CHAIN_ID,
        nonce
      });

      const signer = await provider.getSigner();
      const signature = await signer.signMessage(messageText);

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

      setWalletAddress(address);
      setLinked(true);
      showStatus('✅ Wallet linked successfully! You can now receive bounty payments.', 'success');
    } catch (error) {
      console.error(error);
      showStatus(error.message, 'error');
    }
  };

  return (
    <div className="container" style={{ maxWidth: '500px', padding: '40px', textAlign: 'center' }}>
      <h1 style={{ fontSize: '28px' }}>🔗 Link Your Wallet</h1>
      <p className="subtitle" style={{ marginBottom: '30px', fontSize: '14px' }}>
        Connect your GitHub account with your wallet to receive bounty payments
      </p>

      <div style={{
        background: '#f7fafc',
        border: '1px solid #e2e8f0',
        borderRadius: '8px',
        padding: '20px',
        marginBottom: '20px',
        textAlign: 'left'
      }}>
        <h3 style={{ fontSize: '16px', color: '#2d3748', marginBottom: '10px' }}>
          Step 1: Authenticate with GitHub
        </h3>
        <p style={{ fontSize: '14px', color: '#4a5568', lineHeight: '1.6' }}>
          We need to verify your GitHub account.
        </p>
      </div>

      <button
        className="btn btn-secondary"
        onClick={authenticateGitHub}
        disabled={githubUser !== null}
        style={{ width: '100%', marginBottom: '10px' }}
      >
        {githubUser ? `✓ ${githubUser.githubUsername}` : 'Authenticate with GitHub'}
      </button>

      <div style={{
        display: 'flex',
        alignItems: 'center',
        margin: '20px 0',
        color: '#cbd5e0'
      }}>
        <div style={{ flex: 1, borderBottom: '1px solid #e2e8f0' }} />
        <span style={{ padding: '0 10px', fontSize: '12px', fontWeight: 600 }}>THEN</span>
        <div style={{ flex: 1, borderBottom: '1px solid #e2e8f0' }} />
      </div>

      <div style={{
        background: '#f7fafc',
        border: '1px solid #e2e8f0',
        borderRadius: '8px',
        padding: '20px',
        marginBottom: '20px',
        textAlign: 'left'
      }}>
        <h3 style={{ fontSize: '16px', color: '#2d3748', marginBottom: '10px' }}>
          Step 2: Connect Your Wallet
        </h3>
        <p style={{ fontSize: '14px', color: '#4a5568', lineHeight: '1.6' }}>
          Sign a message with your wallet to link it to your GitHub account.
        </p>
      </div>

      <button
        className="btn btn-primary"
        onClick={connectWallet}
        disabled={!githubUser || linked}
        style={{ width: '100%' }}
      >
        {linked ? '✓ Wallet Linked' : 'Connect Wallet'}
      </button>

      {linked && (
        <div className="wallet-info" style={{ display: 'block', marginTop: '20px' }}>
          <strong>✅ Linked:</strong><br />
          GitHub: {githubUser?.githubUsername}<br />
          Wallet: {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
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

export default LinkWallet;

