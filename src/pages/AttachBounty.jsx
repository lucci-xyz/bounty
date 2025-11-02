import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ethers } from 'ethers';
import { NETWORKS, CONTRACTS, ESCROW_ABI, ERC20_ABI, getNetworkConfig } from '../config/networks';
import { MoneyIcon, WalletIcon } from '../components/Icons';

function AttachBounty() {
  const [searchParams] = useSearchParams();
  const [selectedNetwork, setSelectedNetwork] = useState('BASE_SEPOLIA');
  const [walletAddress, setWalletAddress] = useState('');
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [amount, setAmount] = useState('');
  const [deadline, setDeadline] = useState('');
  const [status, setStatus] = useState({ message: '', type: '' });
  const [showForm, setShowForm] = useState(false);

  const repoFullName = searchParams.get('repo');
  const issueNumber = searchParams.get('issue');
  const repoId = searchParams.get('repoId');
  const installationId = searchParams.get('installationId');
  const presetAmount = searchParams.get('amount');

  const networkConfig = NETWORKS[selectedNetwork];
  const contractConfig = CONTRACTS[selectedNetwork];

  useEffect(() => {
    if (presetAmount) {
      setAmount(presetAmount);
    }
    const defaultDeadline = new Date();
    defaultDeadline.setDate(defaultDeadline.getDate() + 7);
    setDeadline(defaultDeadline.toISOString().split('T')[0]);
  }, [presetAmount]);

  const showStatus = (message, type) => {
    setStatus({ message, type });
  };

  const connectWallet = async () => {
    try {
      showStatus('Connecting wallet...', 'loading');

      if (!window.ethereum) {
        showStatus('Please install MetaMask or another Web3 wallet', 'error');
        window.open('https://metamask.io/download/', '_blank');
        return;
      }

      const newProvider = new ethers.BrowserProvider(window.ethereum);
      const accounts = await newProvider.send('eth_requestAccounts', []);
      const address = accounts[0];

      const network = await newProvider.getNetwork();

      if (Number(network.chainId) !== networkConfig.chainId) {
        showStatus(`Switching to ${networkConfig.name}...`, 'loading');
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
        // Reconnect after network switch
        const updatedProvider = new ethers.BrowserProvider(window.ethereum);
        setProvider(updatedProvider);
        setSigner(await updatedProvider.getSigner());
      } else {
        setProvider(newProvider);
        setSigner(await newProvider.getSigner());
      }

      setWalletAddress(address);
      setShowForm(true);
      showStatus('Wallet connected!', 'success');
    } catch (error) {
      console.error('Wallet connection error:', error);
      showStatus(error.message || 'Failed to connect wallet', 'error');
    }
  };

  const fundBounty = async () => {
    try {
      if (!repoFullName || !issueNumber || !repoId) {
        throw new Error('Missing required parameters. Please use the link from GitHub.');
      }

      if (!amount || parseFloat(amount) <= 0) {
        throw new Error('Please enter a valid amount');
      }

      if (!deadline) {
        throw new Error('Please select a deadline');
      }

      const deadlineTimestamp = Math.floor(new Date(deadline).getTime() / 1000);
      const amountWei = ethers.parseUnits(amount, contractConfig.tokenDecimals);

      showStatus(`Approving ${contractConfig.tokenSymbol}...`, 'loading');

      const token = new ethers.Contract(contractConfig.token, ERC20_ABI, signer);
      const approveTx = await token.approve(contractConfig.escrow, amountWei);
      await approveTx.wait();

      showStatus('Creating bounty on-chain...', 'loading');

      const escrow = new ethers.Contract(contractConfig.escrow, ESCROW_ABI, signer);
      const repoIdHash = '0x' + parseInt(repoId).toString(16).padStart(64, '0');

      const tx = await escrow.createBounty(
        walletAddress,
        repoIdHash,
        parseInt(issueNumber),
        deadlineTimestamp,
        amountWei
      );

      const receipt = await tx.wait();

      showStatus('Recording bounty in database...', 'loading');

      const response = await fetch('/api/bounty/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repoFullName,
          repoId: parseInt(repoId),
          issueNumber: parseInt(issueNumber),
          sponsorAddress: walletAddress,
          amount: amountWei.toString(),
          deadline: deadlineTimestamp,
          txHash: receipt.hash,
          installationId: parseInt(installationId) || 0,
          network: selectedNetwork,
          tokenSymbol: contractConfig.tokenSymbol
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to record bounty');
      }

      showStatus('✅ Bounty created! Redirecting...', 'success');

      setTimeout(() => {
        window.open(`https://github.com/${repoFullName}/issues/${issueNumber}`, '_self');
      }, 2000);
    } catch (error) {
      console.error('Bounty creation error:', error);
      showStatus(error.message || 'Failed to create bounty', 'error');
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
            <MoneyIcon size={32} color="var(--color-primary)" />
          </div>
        </div>
        <h1 style={{ fontSize: '40px' }}>Attach Bounty</h1>
        <p className="subtitle" style={{ fontSize: '16px', marginBottom: '0' }}>
          Fund this issue with crypto. Payment triggers automatically when PR merges.
        </p>
      </div>

      <div className="info-box" style={{ marginBottom: '32px' }}>
        <p><strong>Repository:</strong> {repoFullName || 'Loading...'}</p>
        <p><strong>Issue:</strong> #{issueNumber || '-'}</p>
        {repoFullName && issueNumber && (
          <p>
            <a href={`https://github.com/${repoFullName}/issues/${issueNumber}`} target="_blank" rel="noopener noreferrer">
              View on GitHub →
            </a>
          </p>
        )}
      </div>

      {!showForm && (
        <>
          <div style={{ marginBottom: '24px' }}>
            <label htmlFor="network">Network</label>
            <select
              id="network"
              value={selectedNetwork}
              onChange={(e) => setSelectedNetwork(e.target.value)}
            >
              <option value="BASE_SEPOLIA">Base Sepolia (USDC)</option>
              <option value="MEZO_TESTNET">Mezo Testnet (MUSD)</option>
            </select>
            <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginTop: '8px', marginBottom: '0' }}>
              {networkConfig.name} • Chain ID: {networkConfig.chainId}
            </p>
          </div>

          <button className="btn btn-primary btn-full" onClick={connectWallet}>
            <WalletIcon size={20} color="white" />
            Connect Wallet
          </button>
        </>
      )}

      {showForm && (
        <>
          <div className="wallet-info" style={{ marginBottom: '32px' }}>
            <div><strong>Connected:</strong> {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}</div>
            <div><strong>Network:</strong> {networkConfig.name} ({contractConfig.tokenSymbol})</div>
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label htmlFor="amount">Bounty Amount ({contractConfig.tokenSymbol})</label>
            <input
              type="number"
              id="amount"
              placeholder="500"
              min="1"
              step={contractConfig.tokenDecimals === 18 ? "0.0001" : "0.01"}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>

          <div style={{ marginBottom: '32px' }}>
            <label htmlFor="deadline">Deadline</label>
            <input
              type="date"
              id="deadline"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
            />
          </div>

          <button className="btn btn-primary btn-full" onClick={fundBounty}>
            Fund Bounty
          </button>

          <button 
            className="btn btn-secondary btn-full" 
            onClick={() => {
              setShowForm(false);
              setWalletAddress('');
              setProvider(null);
              setSigner(null);
            }}
          >
            Change Network
          </button>
        </>
      )}

      {status.message && (
        <div className={`status ${status.type}`}>
          {status.message}
        </div>
      )}
    </div>
  );
}

export default AttachBounty;
