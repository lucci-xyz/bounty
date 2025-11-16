'use client';

import { useState } from 'react';
import { useAccount, useWalletClient, useSwitchChain } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { ethers } from 'ethers';
import { NETWORKS, CONTRACTS } from '@/config/networks';
import { RefreshIcon, AlertIcon } from '@/components/Icons';
import PageHeader from '@/components/PageHeader';
import NetworkSelector from '@/components/NetworkSelector';
import WalletInfo from '@/components/WalletInfo';
import StatusMessage from '@/components/StatusMessage';

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
      
      // Mezo testnet doesn't support EIP-1559, use legacy transactions
      let txOverrides = {};
      if (selectedNetwork === 'MEZO_TESTNET') {
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
      <PageHeader
        icon={RefreshIcon}
        title="Refund Bounty"
        subtitle="Request refund for expired bounties that were never resolved"
      />

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
          <div className="animate-fade-in-up delay-200">
            <NetworkSelector
              selectedNetwork={selectedNetwork}
              onNetworkChange={setSelectedNetwork}
            />
          </div>

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
          <WalletInfo
            address={address}
            network={networkConfig.name}
            tokenSymbol={contractConfig.tokenSymbol}
          />

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

      <StatusMessage message={status.message} type={status.type} />
    </div>
  );
}
