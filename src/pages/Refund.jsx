import { useState } from 'react';
import { ethers } from 'ethers';
import { NETWORKS, CONTRACTS, getNetworkConfig } from '../config/networks';
import { RefreshIcon, WalletIcon, AlertIcon } from '../components/Icons';

const ESCROW_ABI = [
  'function refundExpired(bytes32 bountyId) external',
  'function getBounty(bytes32 bountyId) external view returns (tuple(bytes32 repoIdHash, address sponsor, address resolver, uint96 amount, uint64 deadline, uint64 issueNumber, uint8 status))'
];

function Refund() {
  const [selectedNetwork, setSelectedNetwork] = useState('BASE_SEPOLIA');
  const [bountyId, setBountyId] = useState('');
  const [bountyInfo, setBountyInfo] = useState(null);
  const [currentBounty, setCurrentBounty] = useState(null);
  const [status, setStatus] = useState({ message: '', type: '' });
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [refunded, setRefunded] = useState(false);
  const [connected, setConnected] = useState(false);

  const networkConfig = NETWORKS[selectedNetwork];
  const contractConfig = CONTRACTS[selectedNetwork];

  const showStatus = (message, type) => {
    setStatus({ message, type });
  };

  const connectWallet = async () => {
    try {
      if (!window.ethereum) {
        throw new Error('Please install MetaMask');
      }

      showStatus('Connecting wallet...', 'loading');

      const newProvider = new ethers.BrowserProvider(window.ethereum);
      await newProvider.send('eth_requestAccounts', []);
      
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
        const updatedProvider = new ethers.BrowserProvider(window.ethereum);
        setProvider(updatedProvider);
        setSigner(await updatedProvider.getSigner());
      } else {
        setProvider(newProvider);
        setSigner(await newProvider.getSigner());
      }

      setConnected(true);
      showStatus('Wallet connected!', 'success');
    } catch (error) {
      console.error('Connection error:', error);
      showStatus(error.message, 'error');
    }
  };

  const checkBounty = async () => {
    try {
      if (!bountyId || !bountyId.startsWith('0x')) {
        throw new Error('Please enter a valid bounty ID (0x...)');
      }

      if (!connected) {
        throw new Error('Please connect your wallet first');
      }

      showStatus('Checking bounty...', 'loading');

      const escrow = new ethers.Contract(contractConfig.escrow, ESCROW_ABI, provider);
      const bounty = await escrow.getBounty(bountyId);

      const amount = ethers.formatUnits(bounty.amount, contractConfig.tokenDecimals);
      const deadline = new Date(Number(bounty.deadline) * 1000);
      const statusText = ['None', 'Open', 'Resolved', 'Refunded', 'Canceled'][Number(bounty.status)];
      const now = new Date();

      setBountyInfo({
        amount,
        deadline: deadline.toISOString().split('T')[0],
        status: statusText,
        sponsor: bounty.sponsor
      });

      const userAddress = await signer.getAddress();
      if (bounty.sponsor.toLowerCase() !== userAddress.toLowerCase()) {
        throw new Error('Only the sponsor can request a refund');
      }

      if (statusText !== 'Open') {
        throw new Error(`Bounty is not open (status: ${statusText})`);
      }

      if (deadline > now) {
        throw new Error('Deadline has not passed yet');
      }

      setCurrentBounty({ bountyId, ...bounty });
      showStatus('✓ Eligible for refund', 'success');
    } catch (error) {
      console.error(error);
      showStatus(error.message, 'error');
      setBountyInfo(null);
      setCurrentBounty(null);
    }
  };

  const requestRefund = async () => {
    try {
      if (!currentBounty) {
        throw new Error('Please check bounty status first');
      }

      showStatus('Requesting refund...', 'loading');

      const escrow = new ethers.Contract(contractConfig.escrow, ESCROW_ABI, signer);
      const tx = await escrow.refundExpired(currentBounty.bountyId);

      showStatus('Waiting for confirmation...', 'loading');
      const receipt = await tx.wait();

      showStatus(`✅ Refund successful! TX: ${receipt.hash}`, 'success');
      setRefunded(true);
    } catch (error) {
      console.error(error);
      showStatus(error.message || 'Refund failed', 'error');
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
            <RefreshIcon size={32} color="var(--color-primary)" />
          </div>
        </div>
        <h1 style={{ fontSize: '40px' }}>Refund Bounty</h1>
        <p className="subtitle" style={{ fontSize: '16px', marginBottom: '0' }}>
          Request refund for expired bounties that were never resolved
        </p>
      </div>

      <div className="warning" style={{ marginBottom: '32px' }}>
        <AlertIcon size={20} color="#B87D00" />
        <div>
          <strong>Eligibility Requirements</strong>
          <div style={{ marginTop: '8px', fontSize: '13px' }}>
            Refunds are only available for bounties that have passed their deadline without being resolved. You must be the original sponsor.
          </div>
        </div>
      </div>

      {!connected && (
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

      {connected && (
        <>
          <div className="wallet-info" style={{ marginBottom: '32px' }}>
            <strong>Network:</strong> {networkConfig.name} ({contractConfig.tokenSymbol})
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label htmlFor="bountyId">Bounty ID</label>
            <input
              type="text"
              id="bountyId"
              placeholder="0x..."
              value={bountyId}
              onChange={(e) => setBountyId(e.target.value)}
            />
          </div>

          <button className="btn btn-secondary btn-full" onClick={checkBounty} style={{ marginBottom: '24px' }}>
            Check Bounty Status
          </button>

          {bountyInfo && (
            <div className="info-box" style={{ marginBottom: '24px' }}>
              <p><strong>Amount:</strong> {bountyInfo.amount} {contractConfig.tokenSymbol}</p>
              <p><strong>Deadline:</strong> {bountyInfo.deadline}</p>
              <p><strong>Status:</strong> {bountyInfo.status}</p>
              <p><strong>Sponsor:</strong> <code>{bountyInfo.sponsor}</code></p>
            </div>
          )}

          {currentBounty && (
            <button
              className="btn btn-danger btn-full"
              onClick={requestRefund}
              disabled={refunded}
            >
              {refunded ? '✓ Refunded' : 'Request Refund'}
            </button>
          )}
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

export default Refund;
