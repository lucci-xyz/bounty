'use client';

import { useState, useEffect, useMemo, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAccount, useWalletClient, useSwitchChain } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { ethers } from 'ethers';
import { MoneyIcon, GitHubIcon } from '@/components/Icons';
import { useNetwork } from '@/components/NetworkProvider';
import { useBetaAccess } from '@/components/BetaAccessProvider';
import BetaAccessModal from '@/components/BetaAccessModal';

const STATUS_VARIANTS = {
  success: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  error: 'bg-destructive/10 text-destructive border border-destructive/30',
  loading: 'bg-primary/5 text-primary border border-primary/20',
  info: 'bg-muted/40 text-foreground/80 border border-border/60'
};

const STATUS_ICONS = {
  success: (
    <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 text-xs font-semibold">
      ✓
    </span>
  ),
  error: (
    <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-destructive/20 text-destructive text-xs font-semibold">
      !
    </span>
  ),
  loading: (
    <span className="inline-flex h-5 w-5 items-center justify-center">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
    </span>
  ),
  info: (
    <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-border/70 text-xs font-semibold text-foreground/70">
      i
    </span>
  )
};

function StatusBanner({ status }) {
  if (!status?.message) return null;
  const variantKey = STATUS_VARIANTS[status.type] ? status.type : 'info';
  const icon = STATUS_ICONS[variantKey] || STATUS_ICONS.info;

  return (
    <div className={`rounded-2xl px-4 py-3 text-sm font-medium ${STATUS_VARIANTS[variantKey]}`}>
      <div className="flex items-center gap-3">
        {icon}
        <p className="text-sm leading-snug">{status.message}</p>
      </div>
    </div>
  );
}

function AttachBountyContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [amount, setAmount] = useState('');
  const [deadline, setDeadline] = useState('');
  const [status, setStatus] = useState({ message: '', type: '' });
  const [isProcessing, setIsProcessing] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [showBetaModal, setShowBetaModal] = useState(false);

  const { address, isConnected, chain } = useAccount();
  const { data: walletClient } = useWalletClient();
  const { switchChain } = useSwitchChain();
  const { hasAccess, betaStatus, loading: betaLoading } = useBetaAccess();

  const repoFullName = searchParams.get('repo');
  const issueNumber = searchParams.get('issue');
  const repoId = searchParams.get('repoId');
  const installationId = searchParams.get('installationId');
  const presetAmount = searchParams.get('amount');
  const handleBack = () => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back();
    } else {
      router.push('/');
    }
  };

  const {
    registry,
    networkGroup,
    defaultAlias,
    selectedAlias,
    setSelectedAlias,
    supportedNetworks,
    currentNetwork: network
  } = useNetwork();

  const supportedNetworkNames = useMemo(
    () => supportedNetworks.map((config) => config.name),
    [supportedNetworks]
  );

  const isChainSupported = useMemo(() => {
    if (!chain?.id) {
      return true;
    }
    return supportedNetworks.some((config) => config.chainId === chain.id);
  }, [chain?.id, supportedNetworks]);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!betaLoading) {
      setShowBetaModal(!hasAccess);
    }
  }, [betaLoading, hasAccess]);

  useEffect(() => {
    if (!registry || Object.keys(registry).length === 0) {
      return;
    }

    if (!isConnected || !chain?.id) {
      if (defaultAlias && selectedAlias !== defaultAlias) {
        setSelectedAlias(defaultAlias);
      }
      return;
    }

    const matchingEntry = Object.entries(registry).find(([key, config]) => {
      if (networkGroup && config.group !== networkGroup) {
        return false;
      }
      return config.chainId === chain.id;
    });

    if (matchingEntry) {
      const [matchedAlias] = matchingEntry;
      if (matchedAlias !== selectedAlias) {
        setSelectedAlias(matchedAlias);
      }
    } else if (defaultAlias && selectedAlias !== defaultAlias) {
      setSelectedAlias(defaultAlias);
    }
  }, [chain?.id, defaultAlias, isConnected, networkGroup, registry, selectedAlias, setSelectedAlias]);

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
    if (!network) {
      showStatus('Network configuration not ready yet. Please wait a moment and try again.', 'error');
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
      let effectiveChainId = chain?.id ?? null;

      if (effectiveChainId === null) {
        throw new Error('Unable to detect your connected network. Please reconnect your wallet.');
      }

      if (effectiveChainId !== network.chainId) {
        showStatus(`Switching to ${network.name}...`, 'loading');
        try {
          await switchChain({ chainId: network.chainId });
          // Give wallets a short window to propagate the new chain
          await new Promise(resolve => setTimeout(resolve, 800));
          effectiveChainId = network.chainId;
        } catch (switchError) {
          console.error('Network switch error:', switchError);
          throw new Error(`Failed to switch to ${network.name}. Please switch manually in your wallet and try again.`);
        }
      }
      
      // Double-check we're on the correct network
      if (effectiveChainId !== network.chainId) {
        throw new Error(`Please switch to ${network.name} (Chain ID: ${network.chainId}) in your wallet and try again.`);
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
      
      
      const amountWei = ethers.parseUnits(amount, network.token.decimals);

      // Check token balance first
      showStatus(`Checking ${network.token.symbol} balance...`, 'loading');
      const token = new ethers.Contract(network.token.address, [
        'function balanceOf(address) view returns (uint256)',
        'function approve(address spender, uint256 amount) external returns (bool)',
        'function allowance(address owner, address spender) external view returns (uint256)'
      ], signer);

      const balance = await token.balanceOf(address);

      if (balance < amountWei) {
        throw new Error(`Insufficient ${network.token.symbol} balance. You have ${ethers.formatUnits(balance, network.token.decimals)} ${network.token.symbol}, but need ${ethers.formatUnits(amountWei, network.token.decimals)}.`);
      }

      const currentAllowance = await token.allowance(address, network.contracts.escrow);

      // Only approve if needed
      if (currentAllowance < amountWei) {
        showStatus(`Approving ${network.token.symbol}...`, 'loading');
        
        try {
          const approveTx = await token.approve(network.contracts.escrow, amountWei);
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
          
          throw new Error(`Failed to approve ${network.token.symbol}: ${errorMsg}`);
        }
      }

      // Determine the correct network alias based on the connected chain
      // This ensures we use the network the user actually transacted on
      let networkAliasToSend = selectedAlias || defaultAlias;
      
      if (chain?.id && registry) {
        const matchingEntry = Object.entries(registry).find(([, config]) => {
          if (networkGroup && config.group !== networkGroup) {
            return false;
          }
          return config.chainId === chain.id;
        });
        
        if (matchingEntry) {
          networkAliasToSend = matchingEntry[0];
        }
      }

      showStatus('Fetching resolver address...', 'loading');
      
      // Get the resolver address for this network from the backend
      let resolverAddress;
      try {
        const resolverRes = await fetch(`/api/resolver?network=${networkAliasToSend}`);
        if (!resolverRes.ok) {
          const resolverError = await resolverRes.json();
          throw new Error(resolverError.error || 'Failed to get resolver address');
        }
        const resolverData = await resolverRes.json();
        resolverAddress = resolverData.resolver;
      } catch (resolverError) {
        console.error('Resolver fetch error:', resolverError);
        throw new Error(`Could not fetch resolver address: ${resolverError.message}`);
      }
      
      showStatus('Creating bounty on-chain...', 'loading');

      const escrow = new ethers.Contract(network.contracts.escrow, [
        'function createBounty(address resolver, bytes32 repoIdHash, uint64 issueNumber, uint64 deadline, uint256 amount) external returns (bytes32)',
        'function computeBountyId(address sponsor, bytes32 repoIdHash, uint64 issueNumber) public pure returns (bytes32)',
        'function getBounty(bytes32 bountyId) external view returns (tuple(bytes32 repoIdHash, address sponsor, address resolver, uint96 amount, uint64 deadline, uint64 issueNumber, uint8 status))',
        'function paused() external view returns (bool)'
      ], signer);
      
      const repoIdHash = '0x' + parseInt(repoId).toString(16).padStart(64, '0');

      // Pre-flight checks
      showStatus('Validating contract...', 'loading');
      
      // Check if contract exists at this address
      const code = await provider.getCode(network.contracts.escrow);
      if (code === '0x') {
        throw new Error(`No contract found at ${network.contracts.escrow} on ${network.name}. The contract may not be deployed on this network.`);
      }
      
      // Check if contract is paused
      try {
        const isPaused = await escrow.paused();
        if (isPaused) {
          throw new Error(`The ${network.name} bounty contract is currently paused for maintenance. Please try again later or contact support.`);
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
      
      if (!ethers.isAddress(network.contracts.escrow)) {
        throw new Error(`Invalid escrow contract address for ${network.name}. Please contact support.`);
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
        if (!network.supports1559) {
          // Legacy networks may fail gas estimation because token transfers revert under eth_call.
          // Build a legacy transaction manually so we can skip estimateGas entirely.
          const feeData = await provider.getFeeData();
          const legacyGasPrice =
            feeData.gasPrice && feeData.gasPrice > 0n
              ? feeData.gasPrice
              : ethers.parseUnits('1', 'gwei');

          const callData = escrow.interface.encodeFunctionData('createBounty', [
            resolverAddress,
            repoIdHash,
            parseInt(issueNumber),
            deadlineTimestamp,
            amountWei
          ]);

          const txRequest = {
            to: network.contracts.escrow,
            from: address,
            data: callData,
            type: 0,
            gasPrice: legacyGasPrice,
            gasLimit: 400000,
            chainId: network.chainId,
            value: 0
          };

          tx = await signer.sendTransaction(txRequest);
        } else {
          // Default path uses RPC gas estimation
          tx = await escrow.createBounty(
            resolverAddress,
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
            network: networkAliasToSend,
            tokenSymbol: network.token.symbol
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
        userMessage += ` Make sure you're connected to ${network?.name}.`;
      } else if (userMessage.includes('balance')) {
        userMessage += ' Please add more funds to your wallet.';
      }
      
      showStatus(userMessage, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  // Don't render wallet controls until mounted (prevents hydration mismatch)
  if (!isMounted || betaLoading) {
    return (
      <div className="min-h-screen bg-background/80 px-4 py-10 flex items-center justify-center">
        <div className="w-full max-w-md rounded-[32px] border border-border/60 bg-card p-10 text-center shadow-[0_40px_120px_rgba(15,23,42,0.12)]">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <MoneyIcon size={24} color="currentColor" />
          </div>
          <p className="text-sm text-muted-foreground">Preparing bounty flow...</p>
        </div>
      </div>
    );
  }

  const betaModal = (
    <BetaAccessModal
      isOpen={!hasAccess && showBetaModal}
      onClose={handleBack}
      onDismiss={handleBack}
      dismissLabel="Back"
      onAccessGranted={() => {
        setShowBetaModal(false);
        router.refresh();
      }}
    />
  );

  // Check if user came from GitHub App or direct visit
  const hasIssueData = repoFullName && issueNumber && repoId;

  // Direct visit - show setup options
  if (!hasIssueData) {
    return (
      <>
        <div className="min-h-screen bg-background/80 px-4 py-10 flex items-center justify-center">
          <div className="w-full max-w-2xl rounded-[36px] border border-border/60 bg-card p-10 shadow-[0_50px_140px_rgba(15,23,42,0.18)] space-y-8">
            <button
              onClick={handleBack}
              className="inline-flex items-center gap-2 rounded-full border border-border/70 px-4 py-2 text-xs font-medium text-muted-foreground hover:border-primary hover:text-foreground transition-colors"
            >
              ← Back
            </button>
            <div className="text-center space-y-3">
              <h1 className="text-4xl font-light text-foreground/90">Create Bounty</h1>
              <p className="text-sm text-muted-foreground">
                Install the Lucci GitHub App to start funding issues directly from GitHub.
              </p>
            </div>

            <div className="rounded-3xl border border-border/60 bg-muted/40 p-6 space-y-4">
              <div className="space-y-2">
                <h3 className="text-base font-medium text-foreground">Install GitHub App</h3>
                <p className="text-sm text-muted-foreground">
                  Add BountyPay to your repo, then trigger the “Attach Bounty” action from any issue.
                </p>
              </div>
              <a
                href="https://github.com/apps/bountypay"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
              >
                <GitHubIcon size={18} color="white" />
                <span className="text-white">Install GitHub App</span>
              </a>
            </div>

            <div className="rounded-3xl border border-dashed border-border/60 bg-muted/30 p-6 text-sm text-muted-foreground">
              Once installed, open any issue and hit “Attach Bounty” to land back on this page with the issue pre-filled.
            </div>
          </div>
        </div>
        {betaModal}
      </>
    );
  }

  // From GitHub App - existing flow
  return (
    <div className="min-h-screen bg-background/80 px-4 py-10 flex items-center justify-center">
      <div className="w-full max-w-3xl rounded-[36px] border border-border/60 bg-card p-6 md:p-10 shadow-[0_50px_140px_rgba(15,23,42,0.18)] space-y-6">
        <button
          onClick={handleBack}
          className="inline-flex items-center gap-2 rounded-full border border-border/70 px-4 py-2 text-xs font-medium text-muted-foreground hover:border-primary hover:text-foreground transition-colors"
        >
          ← Back
        </button>
        <div className="text-center space-y-3">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <MoneyIcon size={32} color="currentColor" />
          </div>
          <h1 className="text-4xl font-light text-foreground/90">Attach Bounty</h1>
          <p className="text-sm text-muted-foreground">
            Fund this GitHub issue in crypto. Funds release automatically when the PR merges.
          </p>
        </div>

        <div className="rounded-3xl border border-border/60 bg-muted/40 p-6 text-sm text-muted-foreground">
          <div className="flex flex-col gap-2 text-left">
            <div className="flex items-center justify-between text-foreground">
              <span className="text-xs uppercase tracking-[0.35em] text-muted-foreground/70">Repository</span>
              <span className="font-medium">{repoFullName}</span>
            </div>
            <div className="flex items-center justify-between text-foreground">
              <span className="text-xs uppercase tracking-[0.35em] text-muted-foreground/70">Issue</span>
              <span className="font-medium">#{issueNumber}</span>
            </div>
            <a
              href={`https://github.com/${repoFullName}/issues/${issueNumber}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-primary hover:opacity-80"
            >
              View on GitHub →
            </a>
          </div>
        </div>

        {!isConnected ? (
          <ConnectButton.Custom>
            {({ openConnectModal }) => (
              <button
                onClick={(e) => {
                  e.preventDefault();
                  openConnectModal?.();
                }}
                className="inline-flex w-full items-center justify-center rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={!isMounted || !openConnectModal}
              >
                Connect Wallet
              </button>
            )}
          </ConnectButton.Custom>
        ) : (
          <div className="space-y-5">
            <div className="rounded-3xl border border-border/60 bg-muted/30 p-5 text-sm text-muted-foreground">
              <div className="flex items-center justify-between text-foreground">
                <span>Connected</span>
                <span className="font-medium">{address?.slice(0, 6)}...{address?.slice(-4)}</span>
              </div>
              <div className="flex items-center justify-between text-foreground mt-2">
                <span>Network</span>
                <span className="font-medium">{chain?.name || network?.name} ({network?.token.symbol})</span>
              </div>
            </div>

            {!isChainSupported && (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                Connected network ({chain?.name || `Chain ID ${chain?.id}`}) isn’t supported while {networkGroup === 'mainnet' ? 'mainnet' : 'testnet'} mode is active. Supported networks: {supportedNetworkNames.length ? supportedNetworkNames.join(', ') : 'None'}.
              </div>
            )}

            <ConnectButton.Custom>
              {({ openAccountModal, openChainModal }) => (
                <div className="grid gap-3 md:grid-cols-2">
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      openAccountModal?.();
                    }}
                    disabled={!isMounted || !openAccountModal}
                    className="inline-flex items-center justify-center rounded-full border border-border/70 px-6 py-3 text-sm font-medium text-foreground transition-colors hover:border-primary disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Change Wallet
                  </button>
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      openChainModal?.();
                    }}
                    disabled={!isMounted || !openChainModal}
                    className="inline-flex items-center justify-center rounded-full border border-border/70 px-6 py-3 text-sm font-medium text-foreground transition-colors hover:border-primary disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Switch Network
                  </button>
                </div>
              )}
            </ConnectButton.Custom>

            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.35em] text-muted-foreground/70">
                  Bounty Amount ({network?.token.symbol || 'TOKEN'})
                </label>
                <input
                  type="number"
                  min="1"
                  step={network?.token.decimals === 18 ? '0.0001' : '0.01'}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full rounded-2xl border border-border/60 bg-background px-4 py-3 text-sm text-foreground transition-all focus:border-primary focus:ring-2 focus:ring-primary/10"
                  placeholder="500"
                />
              </div>
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.35em] text-muted-foreground/70">
                  Deadline
                </label>
                <input
                  type="date"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  className="w-full rounded-2xl border border-border/60 bg-background px-4 py-3 text-sm text-foreground transition-all focus:border-primary focus:ring-2 focus:ring-primary/10"
                />
              </div>
            </div>

            <button
              onClick={fundBounty}
              disabled={isProcessing}
              className="inline-flex w-full items-center justify-center rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isProcessing ? 'Processing...' : 'Fund Bounty'}
            </button>
          </div>
        )}

        <StatusBanner status={status} />
      </div>
      {betaModal}
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
