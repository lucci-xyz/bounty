import { useState } from 'react';
import { ethers } from 'ethers';
import { NETWORKS, CONTRACTS, getNetworkConfig } from '../config/networks';

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
    <div className="container" style={{ maxWidth: '500px', padding: '40px' }}>
      <h1 style={{ fontSize: '28px' }}>🔄 Refund Bounty</h1>
      <p className="subtitle" style={{ marginBottom: '30px', fontSize: '14px' }}>
        Request a refund for an expired bounty
      </p>

      <div className="warning">
        <strong>⚠️ Warning:</strong> Refunds are only available for bounties that have passed their deadline without being resolved.
      </div>

      {!connected && (
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

          <button className="btn btn-primary" onClick={connectWallet} style={{ width: '100%', marginBottom: '20px' }}>
            Connect Wallet
          </button>
        </>
      )}

      {connected && (
        <>
          <div className="wallet-info" style={{ marginBottom: '20px' }}>
            <strong>Network:</strong> {networkConfig.name} ({contractConfig.tokenSymbol})
          </div>

          <div>
            <label htmlFor="bountyId">Bounty ID</label>
            <input
              type="text"
              id="bountyId"
              placeholder="0x..."
              value={bountyId}
              onChange={(e) => setBountyId(e.target.value)}
            />
          </div>

          <button className="btn btn-danger" onClick={checkBounty} style={{ width: '100%', marginBottom: '10px' }}>
            Check Bounty Status
          </button>

          {bountyInfo && (
            <div className="info-box">
              <p><strong>Amount:</strong> {bountyInfo.amount} {contractConfig.tokenSymbol}</p>
              <p><strong>Deadline:</strong> {bountyInfo.deadline}</p>
              <p><strong>Status:</strong> {bountyInfo.status}</p>
              <p><strong>Sponsor:</strong> {bountyInfo.sponsor}</p>
            </div>
          )}

          {currentBounty && (
            <button
              className="btn btn-danger"
              onClick={requestRefund}
              disabled={refunded}
              style={{ width: '100%' }}
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
