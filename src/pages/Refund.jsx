import { useState } from 'react';
import { ethers } from 'ethers';

const ESCROW_ADDRESS = '0xb30283b5412B89d8B8dE3C6614aE2754a4545aFD';
const CHAIN_ID = 84532;

const ESCROW_ABI = [
  'function refundExpired(bytes32 bountyId) external',
  'function getBounty(bytes32 bountyId) external view returns (tuple(bytes32 repoIdHash, address sponsor, address resolver, uint96 amount, uint64 deadline, uint64 issueNumber, uint8 status))'
];

function Refund() {
  const [bountyId, setBountyId] = useState('');
  const [bountyInfo, setBountyInfo] = useState(null);
  const [currentBounty, setCurrentBounty] = useState(null);
  const [status, setStatus] = useState({ message: '', type: '' });
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [refunded, setRefunded] = useState(false);

  const showStatus = (message, type) => {
    setStatus({ message, type });
  };

  const checkBounty = async () => {
    try {
      if (!bountyId || !bountyId.startsWith('0x')) {
        throw new Error('Please enter a valid bounty ID (0x...)');
      }

      showStatus('Checking bounty...', 'loading');

      if (!window.ethereum) {
        throw new Error('Please install MetaMask');
      }

      const newProvider = new ethers.BrowserProvider(window.ethereum);
      await newProvider.send('eth_requestAccounts', []);
      const newSigner = await newProvider.getSigner();

      const network = await newProvider.getNetwork();
      if (Number(network.chainId) !== CHAIN_ID) {
        throw new Error('Please switch to Base Sepolia network');
      }

      const escrow = new ethers.Contract(ESCROW_ADDRESS, ESCROW_ABI, newProvider);
      const bounty = await escrow.getBounty(bountyId);

      const amount = ethers.formatUnits(bounty.amount, 6);
      const deadline = new Date(Number(bounty.deadline) * 1000);
      const statusText = ['None', 'Open', 'Resolved', 'Refunded', 'Canceled'][Number(bounty.status)];
      const now = new Date();

      setBountyInfo({
        amount,
        deadline: deadline.toISOString().split('T')[0],
        status: statusText,
        sponsor: bounty.sponsor
      });

      const userAddress = await newSigner.getAddress();
      if (bounty.sponsor.toLowerCase() !== userAddress.toLowerCase()) {
        throw new Error('Only the sponsor can request a refund');
      }

      if (statusText !== 'Open') {
        throw new Error(`Bounty is not open (status: ${statusText})`);
      }

      if (deadline > now) {
        throw new Error('Deadline has not passed yet');
      }

      setProvider(newProvider);
      setSigner(newSigner);
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

      const escrow = new ethers.Contract(ESCROW_ADDRESS, ESCROW_ABI, signer);
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
          <p><strong>Amount:</strong> {bountyInfo.amount} USDC</p>
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

      {status.message && (
        <div className={`status ${status.type}`}>
          {status.message}
        </div>
      )}
    </div>
  );
}

export default Refund;

