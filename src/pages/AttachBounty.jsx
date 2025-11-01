import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ethers } from 'ethers';
import { NETWORKS, CONTRACTS, ESCROW_ABI, ERC20_ABI, getNetworkConfig } from '../config/networks';

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
    <div className="container" style={{ maxWidth: '500px', padding: '40px' }}>
      <h1 style={{ fontSize: '28px' }}>💰 Attach Bounty</h1>
      <p className="subtitle" style={{ marginBottom: '30px', fontSize: '14px' }}>
        Fund this issue with crypto on your preferred network
      </p>

      <div className="info-box">
        <p><strong>Repository:</strong> {repoFullName || 'Loading...'}</p>
        <p><strong>Issue:</strong> #{issueNumber || '-'}</p>
        <p>
          <strong>Link:</strong>{' '}
          {repoFullName && issueNumber && (
            <a href={`https://github.com/${repoFullName}/issues/${issueNumber}`} target="_blank" rel="noopener noreferrer">
              View on GitHub
            </a>
          )}
        </p>
      </div>

      {!showForm && (
        <>
          <div style={{ marginBottom: '20px' }}>
            <label htmlFor="network">Select Network</label>
            <select
              id="network"
              value={selectedNetwork}
              onChange={(e) => setSelectedNetwork(e.target.value)}
              style={{ width: '100%' }}
            >
              <option value="BASE_SEPOLIA">Base Sepolia (USDC)</option>
              <option value="MEZO_TESTNET">Mezo Testnet (MUSD)</option>
            </select>
            <p style={{ fontSize: '12px', color: '#718096', marginTop: '8px' }}>
              {networkConfig.name} • Chain ID: {networkConfig.chainId}
            </p>
          </div>

          <button className="btn btn-primary" onClick={connectWallet} style={{ width: '100%' }}>
            Connect Wallet
          </button>
        </>
      )}

      {showForm && (
        <>
          <div className="wallet-info">
            <strong>Connected:</strong> {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}<br />
            <strong>Network:</strong> {networkConfig.name} ({contractConfig.tokenSymbol})
          </div>

          <div>
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

          <div>
            <label htmlFor="deadline">Deadline</label>
            <input
              type="date"
              id="deadline"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
            />
          </div>

          <button className="btn btn-primary" onClick={fundBounty} style={{ width: '100%' }}>
            Fund Bounty
          </button>

          <button 
            className="btn btn-secondary" 
            onClick={() => {
              setShowForm(false);
              setWalletAddress('');
              setProvider(null);
              setSigner(null);
            }} 
            style={{ width: '100%', marginTop: '10px' }}
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
