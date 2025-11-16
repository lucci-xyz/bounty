'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAccount, useWalletClient, useSwitchChain } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { ethers } from 'ethers';
import { NETWORKS, CONTRACTS } from '@/config/networks';
import { MoneyIcon, GitHubIcon } from '@/components/Icons';
import PageHeader from '@/components/PageHeader';
import NetworkSelector from '@/components/NetworkSelector';
import WalletInfo from '@/components/WalletInfo';
import StatusMessage from '@/components/StatusMessage';

function AttachBountyContent() {
  const searchParams = useSearchParams();
  const [selectedNetwork, setSelectedNetwork] = useState('BASE_SEPOLIA');
  const [amount, setAmount] = useState('');
  const [deadline, setDeadline] = useState('');
  const [status, setStatus] = useState({ message: '', type: '' });
  const [isProcessing, setIsProcessing] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  const { address, isConnected, chain } = useAccount();
  const { data: walletClient } = useWalletClient();
  const { switchChain } = useSwitchChain();

  const repoFullName = searchParams.get('repo');
  const issueNumber = searchParams.get('issue');
  const repoId = searchParams.get('repoId');
  const installationId = searchParams.get('installationId');
  const presetAmount = searchParams.get('amount');

  const networkConfig = NETWORKS[selectedNetwork];
  const contractConfig = CONTRACTS[selectedNetwork];

  useEffect(() => {
    setIsMounted(true);
  }, []);

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
    if (isProcessing) {
      return;
    }
    
    try {
      setIsProcessing(true);
      
      if (!isConnected || !address) {
        throw new Error('Please connect your wallet first');
      }

      if (!walletClient) {
        throw new Error('Wallet client not available. Please reconnect your wallet.');
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
        try {
          await switchChain({ chainId: networkConfig.chainId });
          // Wait longer for network switch to complete and wallet state to sync
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          window.location.reload();
          return;
        } catch (switchError) {
          console.error('Network switch error:', switchError);
          throw new Error(`Failed to switch to ${networkConfig.name}. Please switch manually in your wallet and refresh the page.`);
        }
      }
      
      // Double-check we're on the correct network
      if (chain?.id !== networkConfig.chainId) {
        throw new Error(`Please switch to ${networkConfig.name} (Chain ID: ${networkConfig.chainId}) in your wallet and refresh the page.`);
      }


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
      
      
      const amountWei = ethers.parseUnits(amount, contractConfig.tokenDecimals);

      // Check token balance first
      showStatus(`Checking ${contractConfig.tokenSymbol} balance...`, 'loading');
      const token = new ethers.Contract(contractConfig.token, [
        'function balanceOf(address) view returns (uint256)',
        'function approve(address spender, uint256 amount) external returns (bool)',
        'function allowance(address owner, address spender) external view returns (uint256)'
      ], signer);

      const balance = await token.balanceOf(address);

      if (balance < amountWei) {
        throw new Error(`Insufficient ${contractConfig.tokenSymbol} balance. You have ${ethers.formatUnits(balance, contractConfig.tokenDecimals)} ${contractConfig.tokenSymbol}, but need ${ethers.formatUnits(amountWei, contractConfig.tokenDecimals)}.`);
      }

      const currentAllowance = await token.allowance(address, contractConfig.escrow);

      // Only approve if needed
      if (currentAllowance < amountWei) {
        showStatus(`Approving ${contractConfig.tokenSymbol}...`, 'loading');
        
        try {
          const approveTx = await token.approve(contractConfig.escrow, amountWei);
          await approveTx.wait();
        } catch (approveError) {
          console.error('Approval error:', approveError);
          
          // Parse the error to provide better feedback
          let errorMsg = 'Transaction rejected or failed';
          if (approveError.code === 'ACTION_REJECTED') {
            errorMsg = 'Transaction rejected by user';
          } else if (approveError.message) {
            errorMsg = approveError.message.substring(0, 100);
          }
          
          throw new Error(`Failed to approve ${contractConfig.tokenSymbol}: ${errorMsg}`);
        }
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
      
      // Check if contract is paused
      try {
        const isPaused = await escrow.paused();
        if (isPaused) {
          throw new Error(`The ${networkConfig.name} bounty contract is currently paused for maintenance. Please try again later or contact support.`);
        }
      } catch (pauseError) {
        // If the paused() check fails, the contract might not have this function (unlikely but possible)
        if (!pauseError.message.includes('paused')) {
          console.warn('Could not check paused status:', pauseError.message);
        } else {
          throw pauseError;
        }
      }

      if (!ethers.isAddress(address)) {
        throw new Error('Invalid wallet address. Please reconnect your wallet.');
      }
      
      if (!ethers.isAddress(contractConfig.escrow)) {
        throw new Error(`Invalid escrow contract address for ${networkConfig.name}. Please contact support.`);
      }
      
      if (deadlineTimestamp <= blockTimestamp) {
        throw new Error('Deadline must be in the future. Please select a later date.');
      }
      
      const bountyId = await escrow.computeBountyId(address, repoIdHash, parseInt(issueNumber));
      
      try {
        const existingBounty = await escrow.getBounty(bountyId);
        const status = Number(existingBounty.status);
        
        if (status !== 0 && status !== undefined && status !== null) {
          const statusNames = ['None', 'Open', 'Resolved', 'Refunded', 'Canceled'];
          const statusName = statusNames[status] || 'Unknown';
          throw new Error(`A bounty for this issue already exists with status: ${statusName}. You cannot create a duplicate bounty.`);
        }
      } catch (bountyCheckError) {
        if (bountyCheckError.message && bountyCheckError.message.includes('already exists')) {
          throw bountyCheckError;
        }
      }

      let receipt;
      try {
        let tx;
        if (selectedNetwork === 'MEZO_TESTNET') {
          // Mezo RPC fails gas estimation because token transfers revert under eth_call.
          // Build a legacy transaction manually so we can skip estimateGas entirely.
          const feeData = await provider.getFeeData();
          const legacyGasPrice =
            feeData.gasPrice && feeData.gasPrice > 0n
              ? feeData.gasPrice
              : ethers.parseUnits('1', 'gwei');

          const callData = escrow.interface.encodeFunctionData('createBounty', [
            address,
            repoIdHash,
            parseInt(issueNumber),
            deadlineTimestamp,
            amountWei
          ]);

          const txRequest = {
            to: contractConfig.escrow,
            from: address,
            data: callData,
            type: 0,
            gasPrice: legacyGasPrice,
            gasLimit: 400000,
            chainId: networkConfig.chainId,
            value: 0
          };

          tx = await signer.sendTransaction(txRequest);
        } else {
          // Default path uses RPC gas estimation
          tx = await escrow.createBounty(
            address,
            repoIdHash,
            parseInt(issueNumber),
            deadlineTimestamp,
            amountWei
          );
        }

        receipt = await tx.wait();
      } catch (contractError) {
        console.error('Contract call error:', contractError);
        
        // Parse the error to provide helpful feedback
        let errorMsg = 'Unknown error';
        
        if (contractError.code === 'ACTION_REJECTED') {
          errorMsg = 'Transaction was rejected in your wallet';
        } else if (contractError.reason) {
          errorMsg = contractError.reason;
        } else if (contractError.message) {
          const msg = contractError.message;
          
          // Extract useful error info
          if (msg.includes('insufficient funds')) {
            errorMsg = 'Insufficient ETH/BTC for gas fees';
          } else if (msg.includes('AlreadyExists')) {
            errorMsg = 'Bounty already exists for this issue';
          } else if (msg.includes('InvalidParams')) {
            errorMsg = 'Invalid parameters - check deadline and amount';
          } else if (msg.includes('ZeroAddress')) {
            errorMsg = 'Invalid address provided';
          } else if (msg.includes('execution reverted')) {
            errorMsg = 'Contract rejected the transaction - check all parameters are correct';
          } else if (msg.includes('missing revert data')) {
            errorMsg = 'Transaction simulation failed - the contract may not exist or parameters are invalid';
          } else {
            errorMsg = msg.substring(0, 150);
          }
        }
        
        throw new Error(`Contract call failed: ${errorMsg}`);
      }

      showStatus('Recording bounty in database...', 'loading');

      try {
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
          console.error('Database recording failed:', error);
          
          // Transaction succeeded on-chain but DB failed - still show as success with warning
          showStatus(`⚠️ Bounty created on-chain but database sync failed. Redirecting back to GitHub...`, 'error');
          
          setTimeout(() => {
            window.location.href = `https://github.com/${repoFullName}/issues/${issueNumber}`;
          }, 4000);
          return; // Exit early, don't throw
        }

        showStatus('✅ Bounty created! Redirecting back to GitHub...', 'success');

        setTimeout(() => {
          window.location.href = `https://github.com/${repoFullName}/issues/${issueNumber}`;
        }, 2000);
      } catch (dbError) {
        console.error('Database error:', dbError);
        
        // Transaction succeeded on-chain but DB failed
        showStatus(`⚠️ Bounty created on-chain but database recording failed. Redirecting back to GitHub...`, 'error');
        
        setTimeout(() => {
          window.location.href = `https://github.com/${repoFullName}/issues/${issueNumber}`;
        }, 4000);
      }
    } catch (error) {
      console.error('Bounty creation error:', error);
      
      // Format error message for user display
      let userMessage = error.message || 'Failed to create bounty';
      
      // Add helpful context
      if (userMessage.includes('network')) {
        userMessage += ` Make sure you're connected to ${networkConfig.name}.`;
      } else if (userMessage.includes('balance')) {
        userMessage += ' Please add more funds to your wallet.';
      }
      
      showStatus(userMessage, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  // Don't render wallet controls until mounted (prevents hydration mismatch)
  if (!isMounted) {
    return (
      <div className="container" style={{ maxWidth: '600px', textAlign: 'center', padding: '100px 20px' }}>
        <div style={{ fontSize: '16px', color: 'var(--color-text-secondary)' }}>Loading...</div>
      </div>
    );
  }

  // Check if user came from GitHub App or direct visit
  const hasIssueData = repoFullName && issueNumber && repoId;

  // Direct visit - show setup options
  if (!hasIssueData) {
    return (
      <div className="container" style={{ maxWidth: '600px' }}>
        <PageHeader
          icon={MoneyIcon}
          title="Create Bounty"
          subtitle="First, install the GitHub App to attach bounties to issues"
        />

        <div className="animate-fade-in-up delay-100">
          <div className="card" style={{ marginBottom: '20px' }}>
            <h3 style={{ marginBottom: '12px' }}>Install GitHub App</h3>
            <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)', marginBottom: '20px' }}>
              Install BountyPay on your repositories, then create bounties directly from any issue.
            </p>
            <a 
              href="https://github.com/apps/bountypay" 
              target="_blank" 
              rel="noopener noreferrer"
              className="btn btn-primary btn-full"
            >
              <GitHubIcon size={18} color="white" />
              Install GitHub App
            </a>
          </div>

          <div className="info-box">
            <h3 style={{ fontSize: '16px', marginBottom: '12px' }}>After Installation</h3>
            <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)', margin: 0 }}>
              Once installed, visit any issue in your repository and you'll see an "Attach Bounty" button. 
              Click it to fund the issue with crypto.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // From GitHub App - existing flow
  return (
    <div className="container" style={{ maxWidth: '600px' }}>
      <PageHeader
        icon={MoneyIcon}
        title="Attach Bounty"
        subtitle="Fund this issue with crypto. Payment triggers automatically when PR merges."
      />

      <div className="info-box animate-fade-in-up delay-100" style={{ marginBottom: '32px' }}>
        <p><strong>Repository:</strong> {repoFullName}</p>
        <p><strong>Issue:</strong> #{issueNumber}</p>
        <p>
          <a href={`https://github.com/${repoFullName}/issues/${issueNumber}`} target="_blank" rel="noopener noreferrer">
            View on GitHub →
          </a>
        </p>
      </div>

      {!isConnected ? (
        <>
          <div className="animate-fade-in-up delay-200">
            <NetworkSelector
              selectedNetwork={selectedNetwork}
              onNetworkChange={setSelectedNetwork}
              disabled={isProcessing || isConnected}
            />
          </div>

          <ConnectButton.Custom>
            {({ openConnectModal }) => (
              <button
                onClick={(e) => {
                  e.preventDefault();
                  if (openConnectModal) {
                    openConnectModal();
                  }
                }}
                className="btn btn-primary btn-full"
                disabled={!isMounted || !openConnectModal}
                style={{ cursor: (!isMounted || !openConnectModal) ? 'not-allowed' : 'pointer' }}
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
            network={chain?.name || networkConfig.name}
            tokenSymbol={contractConfig.tokenSymbol}
          />

          <ConnectButton.Custom>
            {({ openAccountModal, openChainModal }) => (
              <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    if (openAccountModal) {
                      openAccountModal();
                    }
                  }}
                  className="btn btn-secondary"
                  disabled={!isMounted || !openAccountModal}
                  style={{ flex: 1, margin: 0, fontSize: '14px', cursor: (!isMounted || !openAccountModal) ? 'not-allowed' : 'pointer' }}
                >
                  Change Wallet
                </button>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    if (openChainModal) {
                      openChainModal();
                    }
                  }}
                  className="btn btn-secondary"
                  disabled={!isMounted || !openChainModal}
                  style={{ flex: 1, margin: 0, fontSize: '14px', cursor: (!isMounted || !openChainModal) ? 'not-allowed' : 'pointer' }}
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

          <button 
            className="btn btn-primary btn-full" 
            onClick={fundBounty}
            disabled={isProcessing}
            style={{ opacity: isProcessing ? 0.6 : 1, cursor: isProcessing ? 'not-allowed' : 'pointer' }}
          >
            {isProcessing ? 'Processing...' : 'Fund Bounty'}
          </button>
        </>
      )}

      <StatusMessage message={status.message} type={status.type} />
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
