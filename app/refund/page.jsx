'use client';

import { useState } from 'react';
import { useAccount, useWalletClient, useSwitchChain } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { ethers } from 'ethers';
import { useEffect } from 'react';
import { RefreshIcon, AlertIcon } from '@/components/Icons';

const ESCROW_ABI = [
  'function refundExpired(bytes32 bountyId) external',
  'function getBounty(bytes32 bountyId) external view returns (tuple(bytes32 repoIdHash, address sponsor, address resolver, uint96 amount, uint64 deadline, uint64 issueNumber, uint8 status))'
];

export default function Refund() {
  const [alias, setAlias] = useState(null);
  const [registry, setRegistry] = useState({});
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

  // Fetch registry on mount
  useEffect(() => {
    async function fetchRegistry() {
      try {
        const response = await fetch('/api/registry');
        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            setRegistry(data.registry);
          }
        }
      } catch (err) {
        console.error('Error fetching registry:', err);
      }
    }
    fetchRegistry();
  }, []);

  // Resolve active alias via API (cookie-driven)
  useEffect(() => {
    const fetchEnv = async () => {
      try {
        const res = await fetch('/api/network/env', { credentials: 'include' });
        if (res.ok) {
          const data = await res.json();
          const group = data.env === 'mainnet' ? 'mainnet' : 'testnet';
          // Get default alias from API instead
          const aliasRes = await fetch(`/api/network/default?group=${group}`);
          if (aliasRes.ok) {
            const aliasData = await aliasRes.json();
            setAlias(aliasData.alias);
          }
        } else {
          // Default to testnet if API fails
          const aliasRes = await fetch('/api/network/default?group=testnet');
          if (aliasRes.ok) {
            const aliasData = await aliasRes.json();
            setAlias(aliasData.alias);
          }
        }
      } catch (err) {
        console.error('Error fetching env:', err);
      }
    };
    fetchEnv();
  }, []);

  const network = alias ? registry[alias] : null;

  const showStatus = (message, type) => {
    setStatus({ message, type });
  };

  const checkBounty = async () => {
    try {
      if (!network) {
        throw new Error('Network not initialized. Please try again.');
      }
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
      if (chain?.id !== network.chainId) {
        showStatus(`Switching to ${network.name}...`, 'loading');
        await switchChain({ chainId: network.chainId });
      }

      showStatus('Checking bounty...', 'loading');

      // Create provider for reading contract
      const provider = new ethers.BrowserProvider(walletClient);
      const escrow = new ethers.Contract(network.contracts.escrow, ESCROW_ABI, provider);
      const bounty = await escrow.getBounty(bountyId);

      const amount = ethers.formatUnits(bounty.amount, network.token.decimals);
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
      if (!network) {
        throw new Error('Network not initialized. Please try again.');
      }
      if (!currentBounty) {
        throw new Error('Please check bounty status first');
      }

      if (!walletClient) {
        throw new Error('Wallet client not available');
      }

      showStatus('Requesting refund...', 'loading');

      const provider = new ethers.BrowserProvider(walletClient);
      const signer = await provider.getSigner();
      const escrow = new ethers.Contract(network.contracts.escrow, ESCROW_ABI, signer);
      
      // Networks without EIP-1559: use legacy transactions
      let txOverrides = {};
      if (!network.supports1559) {
        const feeData = await provider.getFeeData();
        txOverrides = {
          type: 0, // Legacy transaction
          gasPrice: feeData.gasPrice
        };
        console.log('Using legacy transaction with gasPrice:', ethers.formatUnits(feeData.gasPrice, 'gwei'), 'gwei');
      }
      
      const tx = await escrow.refundExpired(currentBounty.bountyId, txOverrides);

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
      <div className="animate-fade-in-up" style={{ textAlign: 'center', marginBottom: '48px' }}>
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
        <h1 style={{ 
          fontSize: 'clamp(32px, 6vw, 40px)',
          fontFamily: "'Space Grotesk', sans-serif",
          letterSpacing: '-0.02em'
        }}>
          Refund Bounty
        </h1>
        <p className="subtitle" style={{ fontSize: 'clamp(15px, 2.5vw, 16px)', marginBottom: '0' }}>
          Request refund for expired bounties that were never resolved
        </p>
      </div>

      <div className="warning animate-fade-in-up delay-100" style={{ marginBottom: '32px' }}>
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
          {/* Network selection is now handled globally via Navbar toggle */}

          <ConnectButton.Custom>
            {({ openConnectModal }) => (
              <button
                onClick={() => {
                  console.log('Opening wallet modal for refund...');
                  openConnectModal();
                }}
                className="btn btn-primary btn-full"
              >
                Connect Wallet
              </button>
            )}
          </ConnectButton.Custom>
        </>
      ) : (
        <>
          <div className="wallet-info" style={{ marginBottom: '24px' }}>
            <div><strong>Connected:</strong> {address?.slice(0, 6)}...{address?.slice(-4)}</div>
            <div><strong>Network:</strong> {network?.name} ({network?.token.symbol})</div>
          </div>

          <ConnectButton.Custom>
            {({ openAccountModal, openChainModal }) => (
              <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
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
              <p><strong>Amount:</strong> {bountyInfo.amount} {network?.token.symbol}</p>
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
