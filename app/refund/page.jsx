'use client';

import { useState } from 'react';
import { useAccount, useWalletClient, useSwitchChain } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { ethers } from 'ethers';
import { NETWORKS, CONTRACTS } from '@/config/networks';
import { RefreshIcon, AlertIcon } from '@/components/Icons';

const ESCROW_ABI = [
  'function refundExpired(bytes32 bountyId) external',
  'function getBounty(bytes32 bountyId) external view returns (tuple(bytes32 repoIdHash, address sponsor, address resolver, uint96 amount, uint64 deadline, uint64 issueNumber, uint8 status))'
];

export default function Refund() {
  const [selectedNetwork, setSelectedNetwork] = useState('BASE_SEPOLIA');
  const [bountyId, setBountyId] = useState('');
  const [bountyInfo, setBountyInfo] = useState(null);
  const [currentBounty, setCurrentBounty] = useState(null);
  const [status, setStatus] = useState({ message: '', type: '' });
  const [refunded, setRefunded] = useState(false);

  const { address, isConnected, chain } = useAccount();
  const { data: walletClient } = useWalletClient();
  const { switchChain } = useSwitchChain();

  // Check if running locally for testing
  const isLocal = process.env.NEXT_PUBLIC_ENV_TARGET === 'local';

  const networkConfig = NETWORKS[selectedNetwork];
  const contractConfig = CONTRACTS[selectedNetwork];

  const showStatus = (message, type) => {
    setStatus({ message, type });
  };

  const checkBounty = async () => {
    try {
      if (!bountyId || !bountyId.startsWith('0x')) {
        throw new Error('Please enter a valid bounty ID (0x...)');
      }

      if (!isConnected || !address) {
        throw new Error('Please connect your wallet first');
      }

      if (!walletClient) {
        throw new Error('Wallet client not available');
      }

      // Check and switch network if needed
      if (chain?.id !== networkConfig.chainId) {
        showStatus(`Switching to ${networkConfig.name}...`, 'loading');
        await switchChain({ chainId: networkConfig.chainId });
      }

      showStatus('Checking bounty...', 'loading');

      // Create provider for reading contract
      const provider = new ethers.BrowserProvider(walletClient);
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

      if (bounty.sponsor.toLowerCase() !== address.toLowerCase()) {
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
      showStatus(error.message || 'An error occurred', 'error');
      setBountyInfo(null);
      setCurrentBounty(null);
    }
  };

  const requestRefund = async () => {
    try {
      if (!currentBounty) {
        throw new Error('Please check bounty status first');
      }

      if (!walletClient) {
        throw new Error('Wallet client not available');
      }

      showStatus('Requesting refund...', 'loading');

      const provider = new ethers.BrowserProvider(walletClient);
      const signer = await provider.getSigner();
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

      {!isConnected ? (
        <>
          <div style={{ marginBottom: '24px' }}>
            <label style={{ marginBottom: '8px' }}>Select Network</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => setSelectedNetwork('BASE_SEPOLIA')}
                style={{
                  flex: 1,
                  padding: '12px',
                  borderRadius: '8px',
                  border: selectedNetwork === 'BASE_SEPOLIA' ? '2px solid var(--color-primary)' : '1px solid var(--color-border)',
                  background: selectedNetwork === 'BASE_SEPOLIA' ? 'rgba(0, 130, 123, 0.1)' : 'var(--color-card)',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 600,
                  color: selectedNetwork === 'BASE_SEPOLIA' ? 'var(--color-primary)' : 'var(--color-text-primary)',
                  transition: 'all 0.2s'
                }}
              >
                Base Sepolia
                <div style={{ fontSize: '12px', fontWeight: 400, marginTop: '4px', color: 'var(--color-text-secondary)' }}>USDC</div>
              </button>
              <button
                onClick={() => setSelectedNetwork('MEZO_TESTNET')}
                style={{
                  flex: 1,
                  padding: '12px',
                  borderRadius: '8px',
                  border: selectedNetwork === 'MEZO_TESTNET' ? '2px solid var(--color-primary)' : '1px solid var(--color-border)',
                  background: selectedNetwork === 'MEZO_TESTNET' ? 'rgba(0, 130, 123, 0.1)' : 'var(--color-card)',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 600,
                  color: selectedNetwork === 'MEZO_TESTNET' ? 'var(--color-primary)' : 'var(--color-text-primary)',
                  transition: 'all 0.2s'
                }}
              >
                Mezo Testnet
                <div style={{ fontSize: '12px', fontWeight: 400, marginTop: '4px', color: 'var(--color-text-secondary)' }}>MUSD</div>
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <ConnectButton />
          </div>
        </>
      ) : (
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
