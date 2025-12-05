import { ethers } from 'ethers';
import { getLinkHref } from '@/config/links';
import { contractStatusToDb, getStatusLabel } from '@/lib/status';

/**
 * Ensure the bounty deadline is valid.
 * Returns at least an hour from now.
 *
 * @param {string} deadline - The desired deadline (ISO or date string).
 * @param {number} currentTimestamp - Current timestamp in seconds.
 * @returns {number} Valid deadline timestamp in seconds.
 */
function ensureDeadline(deadline, currentTimestamp) {
  let deadlineTimestamp = Math.floor(new Date(deadline).getTime() / 1000);
  const minDeadline = currentTimestamp + 3600;

  if (Number.isNaN(deadlineTimestamp) || deadlineTimestamp <= currentTimestamp) {
    return minDeadline;
  }

  if (deadlineTimestamp < minDeadline) {
    return minDeadline;
  }

  return deadlineTimestamp;
}

/**
 * Fetches the resolver contract address for the given network alias.
 *
 * @param {string} networkAlias
 * @returns {Promise<string>} Resolver contract address.
 * @throws If request fails.
 */
async function fetchResolver(networkAlias) {
  const resolverRes = await fetch(`/api/resolver?network=${networkAlias}`);
  if (!resolverRes.ok) {
    const resolverError = await resolverRes.json().catch(() => ({}));
    throw new Error(resolverError.error || 'Failed to get resolver address');
  }
  const resolverData = await resolverRes.json();
  return resolverData.resolver;
}

/**
 * Parses common smart contract errors and returns a simple message.
 *
 * @param {object} error
 * @returns {string}
 */
function mapContractError(error) {
  if (!error) {
    return 'Unknown error';
  }

  if (error.code === 'ACTION_REJECTED') {
    return 'Transaction was rejected in your wallet';
  }

  if (error.reason) {
    return error.reason;
  }

  if (error.message) {
    if (error.message.includes('insufficient funds')) {
      return 'Insufficient ETH/BTC for gas fees';
    }
    if (error.message.includes('AlreadyExists')) {
      return 'Bounty already exists for this issue';
    }
    if (error.message.includes('InvalidParams')) {
      return 'Invalid parameters - check deadline and amount';
    }
    if (error.message.includes('ZeroAddress')) {
      return 'Invalid address provided';
    }
    if (error.message.includes('execution reverted')) {
      return 'Contract rejected the transaction - check all parameters are correct';
    }
    if (error.message.includes('missing revert data')) {
      return 'Transaction simulation failed - the contract may not exist or parameters are invalid';
    }
    return error.message.substring(0, 150);
  }

  return 'Unknown error';
}

/**
 * Creates a bounty on-chain and syncs it to the backend database.
 *
 * @param {Object} params
 * @param {string|number} params.amount - Amount to fund.
 * @param {string} params.deadline - Deadline date (string).
 * @param {Object} params.issueData - GitHub issue data.
 * @param {Object} params.walletContext - Wallet connection information.
 * @param {Object} params.networkContext - Network and contract info.
 * @param {Object} params.callbacks - UI callback functions.
 * @throws If any step fails, throws an Error with a message.
 */
export async function fundBounty({
  amount,
  deadline,
  issueData,
  walletContext,
  networkContext,
  callbacks
}) {
  const {
    address,
    isConnected,
    chain,
    walletClient
  } = walletContext;

  const {
    network,
    switchChain,
    registry,
    networkGroup,
    selectedAlias,
    defaultAlias,
    setSelectedAlias,
    supportedNetworks
  } = networkContext;

  const { showStatus, showError } = callbacks;
  const { repoFullName, issueNumber, repoId, installationId } = issueData;
  const issueHref = getLinkHref('github', 'issue', { repoFullName, issueNumber });

  // Basic validations
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

  let effectiveChainId = chain?.id ?? null;
  if (effectiveChainId === null) {
    throw new Error('Unable to detect your connected network. Please reconnect your wallet.');
  }

  // Switch to the required chain if necessary
  if (effectiveChainId !== network.chainId) {
    showStatus(`Switching to ${network.name}...`, 'loading');
    try {
      await switchChain({ chainId: network.chainId });
      await new Promise((resolve) => setTimeout(resolve, 800));
      effectiveChainId = network.chainId;
    } catch (switchError) {
      console.error('Network switch error:', switchError);
      throw new Error(`Failed to switch to ${network.name}. Please switch manually in your wallet and try again.`);
    }
  }

  if (effectiveChainId !== network.chainId) {
    throw new Error(`Please switch to ${network.name} (Chain ID: ${network.chainId}) in your wallet and try again.`);
  }

  // Setup providers and contract instances
  const provider = new ethers.BrowserProvider(walletClient);
  const signer = await provider.getSigner();
  const currentBlock = await provider.getBlock('latest');
  const blockTimestamp = Number(currentBlock.timestamp);
  const deadlineTimestamp = ensureDeadline(deadline, blockTimestamp);
  const amountWei = ethers.parseUnits(amount, network.token.decimals);

  // Check balance and approve escrow contract if needed
  showStatus(`Checking ${network.token.symbol} balance...`, 'loading');
  const token = new ethers.Contract(
    network.token.address,
    [
      'function balanceOf(address) view returns (uint256)',
      'function approve(address spender, uint256 amount) external returns (bool)',
      'function allowance(address owner, address spender) external view returns (uint256)'
    ],
    signer
  );

  const balance = await token.balanceOf(address);
  if (balance < amountWei) {
    const formattedBalance = ethers.formatUnits(balance, network.token.decimals);
    const formattedRequired = ethers.formatUnits(amountWei, network.token.decimals);
    throw new Error(`Insufficient ${network.token.symbol} balance. You have ${formattedBalance} ${network.token.symbol}, but need ${formattedRequired}.`);
  }

  const currentAllowance = await token.allowance(address, network.contracts.escrow);
  if (currentAllowance < amountWei) {
    showStatus(`Approving ${network.token.symbol}...`, 'loading');
    try {
      const approveTx = await token.approve(network.contracts.escrow, amountWei);
      await approveTx.wait();

      const newAllowance = await token.allowance(address, network.contracts.escrow);
      if (newAllowance < amountWei) {
        throw new Error('Approval transaction mined but allowance not updated. Please retry.');
      }
    } catch (approveError) {
      console.error('Approval error:', approveError);
      const errorMsg =
        approveError.code === 'ACTION_REJECTED'
          ? 'Transaction rejected by user'
          : approveError.message?.substring(0, 120) || 'Transaction rejected or failed';
      throw new Error(`Failed to approve ${network.token.symbol}: ${errorMsg}`);
    }
  }

  // Determine the network alias to send
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

  // Get the resolver address
  showStatus('Fetching resolver address...', 'loading');
  const resolverAddress = await fetchResolver(networkAliasToSend);

  // Prepare to create the bounty on-chain
  showStatus('Creating bounty on-chain...', 'loading');
  const escrow = new ethers.Contract(
    network.contracts.escrow,
    [
      'function createBounty(address resolver, bytes32 repoIdHash, uint64 issueNumber, uint64 deadline, uint256 amount) external returns (bytes32)',
      'function computeBountyId(address sponsor, bytes32 repoIdHash, uint64 issueNumber) public pure returns (bytes32)',
      'function getBounty(bytes32 bountyId) external view returns (tuple(bytes32 repoIdHash, address sponsor, address resolver, uint96 amount, uint64 deadline, uint64 issueNumber, uint8 status))',
      'function paused() external view returns (bool)'
    ],
    signer
  );

  // RepoId is hashed and padded for contract requirements
  const repoIdHash = `0x${parseInt(repoId, 10).toString(16).padStart(64, '0')}`;

  // Check contract code exists at escrow address
  const code = await provider.getCode(network.contracts.escrow);
  if (code === '0x') {
    throw new Error(`No contract found at ${network.contracts.escrow} on ${network.name}. The contract may not be deployed on this network.`);
  }

  // Ensure the contract is not paused
  try {
    const isPaused = await escrow.paused();
    if (isPaused) {
      throw new Error(`The ${network.name} bounty contract is currently paused for maintenance. Please try again later or contact support.`);
    }
  } catch (pauseError) {
    if (pauseError.message?.includes('paused')) {
      throw pauseError;
    }
    console.warn('Could not check paused status:', pauseError.message);
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

  // Compute bounty ID and check for existing bounty
  const bountyId = await escrow.computeBountyId(address, repoIdHash, parseInt(issueNumber, 10));
  try {
    const existingBounty = await escrow.getBounty(bountyId);
    const statusValue = Number(existingBounty.status);
    if (!Number.isNaN(statusValue) && statusValue !== 0) {
      const statusString = contractStatusToDb(statusValue);
      const statusName = getStatusLabel(statusString);
      throw new Error(`A bounty for this issue already exists with status: ${statusName}. You cannot create a duplicate bounty.`);
    }
  } catch (bountyCheckError) {
    if (bountyCheckError.message?.includes('already exists')) {
      throw bountyCheckError;
    }
  }

  // Send the bounty creation transaction
  let receipt;
  try {
    let tx;
    if (!network.supports1559) {
      // Legacy gas mode for certain networks
      const feeData = await provider.getFeeData();
      const legacyGasPrice =
        feeData.gasPrice && feeData.gasPrice > 0n
          ? feeData.gasPrice
          : ethers.parseUnits('1', 'gwei');

      const callData = escrow.interface.encodeFunctionData('createBounty', [
        resolverAddress,
        repoIdHash,
        parseInt(issueNumber, 10),
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
      // EIP-1559 path
      tx = await escrow.createBounty(
        resolverAddress,
        repoIdHash,
        parseInt(issueNumber, 10),
        deadlineTimestamp,
        amountWei
      );
    }

    receipt = await tx.wait();
  } catch (contractError) {
    console.error('Contract call error:', contractError);
    throw new Error(`Contract call failed: ${mapContractError(contractError)}`);
  }

  // Record the bounty in the backend database
  showStatus('Recording bounty in database...', 'loading');
  try {
    const response = await fetch('/api/bounty/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        repoFullName,
        repoId: parseInt(repoId, 10),
        issueNumber: parseInt(issueNumber, 10),
        sponsorAddress: address,
        amount: amountWei.toString(),
        deadline: deadlineTimestamp,
        txHash: receipt.hash,
        installationId: parseInt(installationId, 10) || 0,
        network: networkAliasToSend,
        tokenSymbol: network.token.symbol
      })
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      console.error('Database recording failed:', error);
      showStatus('⚠️ Bounty created on-chain but database sync failed. Redirecting back to GitHub...', 'error');
      setTimeout(() => {
        window.location.href = issueHref;
      }, 4000);
      return;
    }

    showStatus('✅ Bounty created! Redirecting back to GitHub...', 'success');
    setTimeout(() => {
      window.location.href = issueHref;
    }, 2000);
  } catch (dbError) {
    console.error('Database error:', dbError);
    showStatus('⚠️ Bounty created on-chain but database recording failed. Redirecting back to GitHub...', 'error');
    setTimeout(() => {
      window.location.href = issueHref;
    }, 4000);
  }
}
