'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAccount, useWalletClient, useSwitchChain, useDisconnect } from 'wagmi';
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
        // Wait a bit for network switch to complete
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      console.log('Network check:', {
        currentChainId: chain?.id,
        targetChainId: networkConfig.chainId,
        network: selectedNetwork,
        tokenContract: contractConfig.token,
        escrowContract: contractConfig.escrow
      });

      // Create provider and signer using walletClient
      const provider = new ethers.BrowserProvider(walletClient);
      const signer = await provider.getSigner();

      // Get the current block timestamp from the blockchain to ensure deadline is in the future
      const currentBlock = await provider.getBlock('latest');
      const blockTimestamp = Number(currentBlock.timestamp);
      
      let deadlineTimestamp = Math.floor(new Date(deadline).getTime() / 1000);
      
      // Ensure deadline is at least 1 hour in the future from blockchain time
      const minDeadline = blockTimestamp + 3600; // 1 hour buffer
      if (deadlineTimestamp <= blockTimestamp) {
        console.warn(`Deadline ${deadlineTimestamp} is not in the future according to blockchain time ${blockTimestamp}, adjusting...`);
        deadlineTimestamp = minDeadline;
      } else if (deadlineTimestamp < minDeadline) {
        console.warn(`Deadline ${deadlineTimestamp} is too close to current time, adding buffer...`);
        deadlineTimestamp = minDeadline;
      }
      
      console.log('Deadline validation:', {
        blockTimestamp,
        blockTime: new Date(blockTimestamp * 1000).toISOString(),
        deadlineTimestamp,
        deadlineTime: new Date(deadlineTimestamp * 1000).toISOString(),
        isValid: deadlineTimestamp > blockTimestamp
      });
      
      const amountWei = ethers.parseUnits(amount, contractConfig.tokenDecimals);

      // Check token balance first
      showStatus(`Checking ${contractConfig.tokenSymbol} balance...`, 'loading');
      const token = new ethers.Contract(contractConfig.token, [
        'function balanceOf(address) view returns (uint256)',
        'function approve(address spender, uint256 amount) external returns (bool)',
        'function allowance(address owner, address spender) external view returns (uint256)'
      ], signer);

      const balance = await token.balanceOf(address);
      console.log('Token balance:', ethers.formatUnits(balance, contractConfig.tokenDecimals), contractConfig.tokenSymbol);

      if (balance < amountWei) {
        throw new Error(`Insufficient ${contractConfig.tokenSymbol} balance. You have ${ethers.formatUnits(balance, contractConfig.tokenDecimals)} ${contractConfig.tokenSymbol}`);
      }

      showStatus(`Approving ${contractConfig.tokenSymbol}...`, 'loading');

      try {
        const approveTx = await token.approve(contractConfig.escrow, amountWei);
        console.log('Approve tx sent:', approveTx.hash);
        await approveTx.wait();
        console.log('Approve tx confirmed');
      } catch (approveError) {
        console.error('Approval error:', approveError);
        throw new Error(`Failed to approve ${contractConfig.tokenSymbol}: ${approveError.message || 'Transaction rejected'}`);
      }

      showStatus('Creating bounty on-chain...', 'loading');

      const escrow = new ethers.Contract(contractConfig.escrow, [
        'function createBounty(address resolver, bytes32 repoIdHash, uint64 issueNumber, uint64 deadline, uint256 amount) external returns (bytes32)',
        'function computeBountyId(address sponsor, bytes32 repoIdHash, uint64 issueNumber) public pure returns (bytes32)',
        'function getBounty(bytes32 bountyId) external view returns (tuple(bytes32 repoIdHash, address sponsor, address resolver, uint96 amount, uint64 deadline, uint64 issueNumber, uint8 status))',
        'function paused() external view returns (bool)'
      ], signer);
      
      const repoIdHash = '0x' + parseInt(repoId).toString(16).padStart(64, '0');

      // Pre-flight checks
      showStatus('Validating contract...', 'loading');
      
      // Check if contract exists at this address
      const code = await provider.getCode(contractConfig.escrow);
      if (code === '0x') {
        throw new Error(`No contract found at ${contractConfig.escrow} on ${networkConfig.name}. The contract may not be deployed on this network.`);
      }
      console.log('Contract exists at', contractConfig.escrow);
      
      // Check if contract is paused
      try {
        const isPaused = await escrow.paused();
        console.log('Contract paused status:', isPaused);
        if (isPaused) {
          throw new Error('Contract is currently paused. Please try again later.');
        }
      } catch (pauseError) {
        console.warn('Could not check paused status (contract may not have this function):', pauseError.message);
      }

      // Check if bounty already exists
      const bountyId = await escrow.computeBountyId(address, repoIdHash, parseInt(issueNumber));
      console.log('Computed bountyId:', bountyId);
      
      try {
        const existingBounty = await escrow.getBounty(bountyId);
        if (existingBounty.status !== 0) { // 0 = None/doesn't exist
          throw new Error('A bounty for this issue already exists. You can top it up instead of creating a new one.');
        }
      } catch (bountyCheckError) {
        // If getBounty fails, the bounty likely doesn't exist, which is good
        console.log('Bounty does not exist yet (expected)');
      }

      console.log('CreateBounty parameters:', {
        resolver: address,
        repoIdHash,
        issueNumber: parseInt(issueNumber),
        deadline: deadlineTimestamp,
        deadlineDate: new Date(deadlineTimestamp * 1000).toISOString(),
        currentTime: Math.floor(Date.now() / 1000),
        amount: amountWei.toString(),
        amountFormatted: ethers.formatUnits(amountWei, contractConfig.tokenDecimals),
        escrowAddress: contractConfig.escrow
      });

      let receipt;
      try {
        // Let ethers handle gas estimation automatically
        const tx = await escrow.createBounty(
          address,
          repoIdHash,
          parseInt(issueNumber),
          deadlineTimestamp,
          amountWei
        );
        console.log('CreateBounty tx sent:', tx.hash);

        receipt = await tx.wait();
        console.log('CreateBounty tx confirmed');
      } catch (contractError) {
        console.error('Contract call error:', contractError);
        throw new Error(`Contract call failed: ${contractError.reason || contractError.message || 'Unknown error'}`);
      }

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
                onClick={() => {
                  console.log('Base Sepolia selected');
                  setSelectedNetwork('BASE_SEPOLIA');
                }}
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
                onClick={() => {
                  console.log('Mezo Testnet selected');
                  setSelectedNetwork('MEZO_TESTNET');
                }}
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

          <ConnectButton.Custom>
            {({ openConnectModal }) => (
              <button
                onClick={() => {
                  console.log('Opening wallet modal for attach-bounty...');
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
            <div><strong>Network:</strong> {chain?.name || networkConfig.name} ({contractConfig.tokenSymbol})</div>
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
