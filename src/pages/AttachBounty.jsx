import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ethers } from 'ethers';

const ESCROW_ADDRESS = '0xb30283b5412B89d8B8dE3C6614aE2754a4545aFD';
const USDC_ADDRESS = '0x036CbD53842c5426634e7929541eC2318f3dCF7e';
const CHAIN_ID = 84532;
const CHAIN_NAME = 'Base Sepolia';
const RPC_URL = 'https://sepolia.base.org';

const ESCROW_ABI = [
  'function createBounty(address resolver, bytes32 repoIdHash, uint64 issueNumber, uint64 deadline, uint256 amount) external returns (bytes32)',
];

const ERC20_ABI = [
  'function approve(address spender, uint256 amount) external returns (bool)',
  'function allowance(address owner, address spender) external view returns (uint256)'
];

function AttachBounty() {
  const [searchParams] = useSearchParams();
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

      if (Number(network.chainId) !== CHAIN_ID) {
        showStatus('Switching to Base Sepolia...', 'loading');
        try {
          await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: `0x${CHAIN_ID.toString(16)}` }],
          });
        } catch (switchError) {
          if (switchError.code === 4902) {
            await window.ethereum.request({
              method: 'wallet_addEthereumChain',
              params: [{
                chainId: `0x${CHAIN_ID.toString(16)}`,
                chainName: CHAIN_NAME,
                nativeCurrency: {
                  name: 'ETH',
                  symbol: 'ETH',
                  decimals: 18
                },
                rpcUrls: [RPC_URL],
                blockExplorerUrls: ['https://sepolia.basescan.org']
              }],
            });
          } else {
            throw switchError;
          }
        }
      }

      const newSigner = await newProvider.getSigner();
      setProvider(newProvider);
      setSigner(newSigner);
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
      const amountWei = ethers.parseUnits(amount, 6);

      showStatus('Approving USDC...', 'loading');

      const usdc = new ethers.Contract(USDC_ADDRESS, ERC20_ABI, signer);
      const approveTx = await usdc.approve(ESCROW_ADDRESS, amountWei);
      await approveTx.wait();

      showStatus('Creating bounty on-chain...', 'loading');

      const escrow = new ethers.Contract(ESCROW_ADDRESS, ESCROW_ABI, signer);
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
          installationId: parseInt(installationId) || 0
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
        Fund this issue with USDC on Base
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
        <div>
          <button className="btn btn-primary" onClick={connectWallet} style={{ width: '100%' }}>
            Connect Wallet
          </button>
        </div>
      )}

      {showForm && (
        <>
          <div className="wallet-info">
            <strong>Connected:</strong> {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
          </div>

          <div>
            <label htmlFor="amount">Bounty Amount (USDC)</label>
            <input
              type="number"
              id="amount"
              placeholder="500"
              min="1"
              step="0.01"
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

