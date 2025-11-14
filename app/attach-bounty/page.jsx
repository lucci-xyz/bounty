'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAccount, useWalletClient, useSwitchChain } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { ethers } from 'ethers';
import { NETWORKS, CONTRACTS, ESCROW_ABI, ERC20_ABI } from '@/config/networks';
import { MoneyIcon } from '@/components/Icons';

function AttachBountyContent() {
  const searchParams = useSearchParams();
  const [selectedNetwork, setSelectedNetwork] = useState('BASE_SEPOLIA');
  const [amount, setAmount] = useState('');
  const [deadline, setDeadline] = useState('');
  const [status, setStatus] = useState({ message: '', type: '' });

  const { address, isConnected, chain } = useAccount();
  const { data: walletClient } = useWalletClient();
  const { switchChain } = useSwitchChain();

  // Check if running locally for testing
  const isLocal = process.env.NEXT_PUBLIC_ENV_TARGET === 'local';

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

  const fundBounty = async () => {
    try {
      if (!isConnected || !address) {
        throw new Error('Please connect your wallet first');
      }

      if (!walletClient) {
        throw new Error('Wallet client not available');
      }

      if (!repoFullName || !issueNumber || !repoId) {
        throw new Error('Missing required parameters. Please use the link from GitHub.');
      }

      if (!amount || parseFloat(amount) <= 0) {
        throw new Error('Please enter a valid amount');
      }

      if (!deadline) {
        throw new Error('Please select a deadline');
      }

      // Check and switch network if needed
      if (chain?.id !== networkConfig.chainId) {
        showStatus(`Switching to ${networkConfig.name}...`, 'loading');
        await switchChain({ chainId: networkConfig.chainId });
      }

      const deadlineTimestamp = Math.floor(new Date(deadline).getTime() / 1000);
      const amountWei = ethers.parseUnits(amount, contractConfig.tokenDecimals);

      showStatus(`Approving ${contractConfig.tokenSymbol}...`, 'loading');

      // Create provider and signer using walletClient
      const provider = new ethers.BrowserProvider(walletClient);
      const signer = await provider.getSigner();

      const token = new ethers.Contract(contractConfig.token, ERC20_ABI, signer);
      const approveTx = await token.approve(contractConfig.escrow, amountWei);
      await approveTx.wait();

      showStatus('Creating bounty on-chain...', 'loading');

      const escrow = new ethers.Contract(contractConfig.escrow, ESCROW_ABI, signer);
      const repoIdHash = '0x' + parseInt(repoId).toString(16).padStart(64, '0');

      const tx = await escrow.createBounty(
        address,
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
          sponsorAddress: address,
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
            <div><strong>Connected:</strong> {address?.slice(0, 6)}...{address?.slice(-4)}</div>
            <div><strong>Network:</strong> {chain?.name || networkConfig.name} ({contractConfig.tokenSymbol})</div>
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

export default function AttachBounty() {
  return (
    <Suspense fallback={<div className="container" style={{ maxWidth: '600px', textAlign: 'center', padding: '100px 20px' }}>Loading...</div>}>
      <AttachBountyContent />
    </Suspense>
  );
}
