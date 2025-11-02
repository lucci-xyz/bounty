import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { NETWORKS } from '../config/networks';
import { LinkIcon, GitHubIcon, WalletIcon, CheckCircleIcon } from '../components/Icons';

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
  const [selectedNetwork, setSelectedNetwork] = useState('BASE_SEPOLIA');
  const [githubUser, setGithubUser] = useState(null);
  const [walletAddress, setWalletAddress] = useState('');
  const [linked, setLinked] = useState(false);
  const [status, setStatus] = useState({ message: '', type: '' });

  const networkConfig = NETWORKS[selectedNetwork];

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
      if (Number(network.chainId) !== networkConfig.chainId) {
        showStatus(`Please switch to ${networkConfig.name}`, 'error');
        try {
          await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: networkConfig.chainIdHex }],
          });
        } catch (switchError) {
          if (switchError.code === 4902) {
            await window.ethereum.request({
              method: 'wallet_addEthereumChain',
              params: [{
                chainId: networkConfig.chainIdHex,
                chainName: networkConfig.name,
                nativeCurrency: networkConfig.nativeCurrency,
                rpcUrls: [networkConfig.rpcUrl],
                blockExplorerUrls: [networkConfig.blockExplorerUrl]
              }],
            });
          } else {
            throw switchError;
          }
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
                <label htmlFor="network">Network</label>
                <select
                  id="network"
                  value={selectedNetwork}
                  onChange={(e) => setSelectedNetwork(e.target.value)}
                  disabled={!githubUser}
                >
                  <option value="BASE_SEPOLIA">Base Sepolia</option>
                  <option value="MEZO_TESTNET">Mezo Testnet</option>
                </select>
                <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginTop: '8px', marginBottom: '0' }}>
                  {networkConfig.name} • Chain ID: {networkConfig.chainId}
                </p>
              </div>
            )}

            <button
              className={linked ? "btn btn-secondary" : "btn btn-primary"}
              onClick={connectWallet}
              disabled={!githubUser || linked}
              style={{ width: '100%', margin: 0 }}
            >
              {linked ? (
                <>
                  <CheckCircleIcon size={18} />
                  Wallet Linked
                </>
              ) : (
                <>
                  <WalletIcon size={18} color="white" />
                  Connect Wallet
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {linked && (
        <div className="wallet-info">
          <div><strong>GitHub:</strong> {githubUser?.githubUsername}</div>
          <div><strong>Wallet:</strong> {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}</div>
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

export default LinkWallet;
