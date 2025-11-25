import { ethers } from 'ethers';

/**
 * ABI for fee-related contract functions
 */
const FEE_ABI = [
  'function withdrawFees(address to, uint256 amount) external',
  'function availableFees() external view returns (uint256)',
  'function owner() external view returns (address)'
];

/**
 * Parse common contract errors into user-friendly messages
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
    if (error.message.includes('OwnableUnauthorizedAccount')) {
      return 'Only the contract owner can withdraw fees. Please connect with the owner wallet.';
    }
    if (error.message.includes('NoFeesAvailable')) {
      return 'No fees available to withdraw';
    }
    if (error.message.includes('InsufficientFees')) {
      return 'Insufficient fees available for the requested amount';
    }
    if (error.message.includes('ZeroAddress')) {
      return 'Invalid treasury address provided';
    }
    if (error.message.includes('insufficient funds')) {
      return 'Insufficient native balance for gas fees';
    }
    if (error.message.includes('execution reverted')) {
      return 'Transaction reverted - check owner permissions and available balance';
    }
    return error.message.substring(0, 150);
  }

  return 'Unknown error';
}

/**
 * Validate Ethereum address format
 */
function isValidAddress(address) {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

/**
 * Withdraw protocol fees from a network's escrow contract.
 * This function handles the client-side transaction signing via the connected wallet.
 *
 * @param {Object} params
 * @param {Object} params.network - Network configuration from registry
 * @param {string} params.treasury - Address to send fees to
 * @param {string} [params.amount='0'] - Amount to withdraw (0 = withdraw all)
 * @param {Object} params.walletContext - Wallet connection from wagmi
 * @param {Function} params.switchChain - Function to switch chains
 * @param {Function} [params.onStatusChange] - Callback for status updates
 * @returns {Promise<Object>} Transaction result with txHash and amount
 */
export async function withdrawFees({
  network,
  treasury,
  amount = '0',
  walletContext,
  switchChain,
  onStatusChange
}) {
  const { address, isConnected, chain, walletClient } = walletContext;
  const updateStatus = (message, type = 'loading') => {
    onStatusChange?.({ message, type });
  };

  // Validate wallet connection
  if (!isConnected || !address) {
    throw new Error('Please connect your wallet first');
  }

  if (!walletClient) {
    throw new Error('Wallet client not available. Please reconnect your wallet.');
  }

  // Validate treasury address
  if (!treasury || !isValidAddress(treasury)) {
    throw new Error('Invalid treasury address');
  }

  // Validate network
  if (!network || !network.contracts?.escrow) {
    throw new Error('Invalid network configuration');
  }

  let effectiveChainId = chain?.id ?? null;
  if (effectiveChainId === null) {
    throw new Error('Unable to detect your connected network. Please reconnect your wallet.');
  }

  // Switch to the required chain if necessary
  if (effectiveChainId !== network.chainId) {
    updateStatus(`Switching to ${network.name}...`);
    try {
      await switchChain({ chainId: network.chainId });
      // Wait for the switch to complete
      await new Promise((resolve) => setTimeout(resolve, 1000));
      effectiveChainId = network.chainId;
    } catch (switchError) {
      console.error('Network switch error:', switchError);
      throw new Error(`Failed to switch to ${network.name}. Please switch manually in your wallet and try again.`);
    }
  }

  // Verify we're on the correct chain
  if (effectiveChainId !== network.chainId) {
    throw new Error(`Please switch to ${network.name} (Chain ID: ${network.chainId}) in your wallet and try again.`);
  }

  // Create provider and contract instance
  updateStatus('Preparing transaction...');
  const provider = new ethers.BrowserProvider(walletClient);
  const signer = await provider.getSigner();
  
  const escrowContract = new ethers.Contract(
    network.contracts.escrow,
    FEE_ABI,
    signer
  );

  // Verify contract exists
  const code = await provider.getCode(network.contracts.escrow);
  if (code === '0x') {
    throw new Error(`No contract found at ${network.contracts.escrow} on ${network.name}`);
  }

  // Verify connected wallet is the contract owner
  updateStatus('Verifying owner permissions...');
  let contractOwner;
  try {
    contractOwner = await escrowContract.owner();
  } catch (ownerError) {
    console.error('Error fetching owner:', ownerError);
    throw new Error('Unable to verify contract owner. The contract may not support owner checks.');
  }

  if (contractOwner.toLowerCase() !== address.toLowerCase()) {
    throw new Error(
      `Only the contract owner can withdraw fees.\n\nConnected: ${address.slice(0, 8)}...${address.slice(-6)}\nOwner: ${contractOwner.slice(0, 8)}...${contractOwner.slice(-6)}`
    );
  }

  // Check available fees
  updateStatus('Checking available fees...');
  const availableFees = await escrowContract.availableFees();
  
  if (availableFees === 0n) {
    throw new Error('No fees available to withdraw');
  }

  const withdrawAmount = BigInt(amount);
  if (withdrawAmount > 0n && withdrawAmount > availableFees) {
    const availableFormatted = ethers.formatUnits(availableFees, network.token.decimals);
    throw new Error(`Insufficient fees. Available: ${availableFormatted} ${network.token.symbol}`);
  }

  // Determine actual amount to withdraw
  const actualAmount = withdrawAmount === 0n ? availableFees : withdrawAmount;
  const formattedAmount = ethers.formatUnits(actualAmount, network.token.decimals);

  // Build transaction overrides for networks that don't support EIP-1559
  updateStatus(`Withdrawing ${formattedAmount} ${network.token.symbol}...`);
  
  let receipt;
  try {
    let tx;
    if (!network.supports1559) {
      // Legacy transaction for non-EIP-1559 networks
      const feeData = await provider.getFeeData();
      const legacyGasPrice = feeData.gasPrice && feeData.gasPrice > 0n
        ? feeData.gasPrice
        : ethers.parseUnits('1', 'gwei');

      const callData = escrowContract.interface.encodeFunctionData('withdrawFees', [
        treasury,
        withdrawAmount
      ]);

      const txRequest = {
        to: network.contracts.escrow,
        from: address,
        data: callData,
        type: 0,
        gasPrice: legacyGasPrice,
        gasLimit: 100000,
        chainId: network.chainId,
        value: 0
      };

      tx = await signer.sendTransaction(txRequest);
    } else {
      // EIP-1559 transaction
      tx = await escrowContract.withdrawFees(treasury, withdrawAmount);
    }

    updateStatus('Waiting for confirmation...');
    receipt = await tx.wait();
  } catch (txError) {
    console.error('Transaction error:', txError);
    throw new Error(mapContractError(txError));
  }

  updateStatus(`Successfully withdrawn ${formattedAmount} ${network.token.symbol}!`, 'success');

  return {
    success: true,
    txHash: receipt.hash,
    blockNumber: receipt.blockNumber,
    amount: actualAmount.toString(),
    formattedAmount,
    treasury,
    network: {
      alias: network.alias,
      name: network.name,
      tokenSymbol: network.token.symbol
    }
  };
}

