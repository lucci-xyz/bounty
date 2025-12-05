import { ethers } from 'ethers';
import { logger } from '@/lib/logger';
import { ABIS } from '@/config/chain-registry';

/**
 * Maps contract errors to user-friendly messages.
 * Handles common Solidity revert reasons and ethers.js error codes.
 */
function mapContractError(error) {
  if (!error) return 'Unknown error';
  if (error.code === 'ACTION_REJECTED') return 'Transaction was rejected in your wallet';
  if (error.reason) return error.reason;

  if (error.message) {
    if (error.message.includes('OwnableUnauthorizedAccount')) {
      return 'Only the contract owner can withdraw fees. Please connect with the owner wallet.';
    }
    if (error.message.includes('NoFeesAvailable')) return 'No fees available to withdraw';
    if (error.message.includes('InsufficientFees')) return 'Insufficient fees for requested amount';
    if (error.message.includes('ZeroAddress')) return 'Invalid treasury address';
    if (error.message.includes('insufficient funds')) return 'Insufficient native balance for gas';
    if (error.message.includes('execution reverted')) return 'Transaction reverted by contract';
    return error.message.substring(0, 150);
  }
  return 'Unknown error';
}

/**
 * Withdraws protocol fees from a network's escrow contract.
 * Requires the connected wallet to be the contract owner.
 *
 * @param {Object} params
 * @param {Object} params.network - Network config (chainId, contracts, token, supports1559)
 * @param {string} params.treasury - Recipient address for withdrawn fees
 * @param {string} [params.amount='0'] - Amount in wei (0 = withdraw all available)
 * @param {Object} params.walletContext - Wagmi wallet state (address, isConnected, chain, walletClient)
 * @param {Function} params.switchChain - Chain switching function from useSwitchChain
 * @param {Function} [params.onStatusChange] - Callback for UI status updates
 * @returns {Promise<Object>} Result with txHash, amount, and network info
 * @throws {Error} On validation failure, permission denied, or transaction error
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
  const updateStatus = (message, type = 'loading') => onStatusChange?.({ message, type });

  // Validate inputs
  if (!isConnected || !address) throw new Error('Please connect your wallet first');
  if (!walletClient) throw new Error('Wallet client not available. Please reconnect your wallet.');
  if (!treasury || !/^0x[a-fA-F0-9]{40}$/.test(treasury)) throw new Error('Invalid treasury address');
  if (!network?.contracts?.escrow) throw new Error('Invalid network configuration');

  let effectiveChainId = chain?.id ?? null;
  if (effectiveChainId === null) {
    throw new Error('Unable to detect connected network. Please reconnect your wallet.');
  }

  // Switch chain if needed
  if (effectiveChainId !== network.chainId) {
    updateStatus(`Switching to ${network.name}...`);
    try {
      await switchChain({ chainId: network.chainId });
      await new Promise(resolve => setTimeout(resolve, 1000));
      effectiveChainId = network.chainId;
    } catch (err) {
      logger.warn('Network switch failed:', err.message);
      throw new Error(`Failed to switch to ${network.name}. Please switch manually.`);
    }
  }

  if (effectiveChainId !== network.chainId) {
    throw new Error(`Please switch to ${network.name} in your wallet.`);
  }

  // Setup contract
  updateStatus('Preparing transaction...');
  const provider = new ethers.BrowserProvider(walletClient);
  const signer = await provider.getSigner();
  const escrowContract = new ethers.Contract(network.contracts.escrow, ABIS.escrow, signer);

  // Verify contract exists
  const code = await provider.getCode(network.contracts.escrow);
  if (code === '0x') {
    throw new Error(`No contract found at ${network.contracts.escrow} on ${network.name}`);
  }

  // Verify owner permission
  updateStatus('Verifying owner permissions...');
  let contractOwner;
  try {
    contractOwner = await escrowContract.owner();
  } catch (err) {
    logger.error('Failed to fetch contract owner:', err);
    throw new Error('Unable to verify contract owner.');
  }

  if (contractOwner.toLowerCase() !== address.toLowerCase()) {
    const shortAddr = (a) => `${a.slice(0, 8)}...${a.slice(-6)}`;
    throw new Error(
      `Only the contract owner can withdraw.\nConnected: ${shortAddr(address)}\nOwner: ${shortAddr(contractOwner)}`
    );
  }

  // Check available fees (new ABI: availableFees(token))
  updateStatus('Checking available fees...');
  const tokenAddress = network.token.address;
  if (!tokenAddress) throw new Error('Token address not configured for this network');

  const availableFeesAmount = await escrowContract.availableFees(tokenAddress);
  if (availableFeesAmount === 0n) throw new Error('No fees available to withdraw');

  const withdrawAmount = BigInt(amount);
  if (withdrawAmount > 0n && withdrawAmount > availableFeesAmount) {
    const available = ethers.formatUnits(availableFeesAmount, network.token.decimals);
    throw new Error(`Insufficient fees. Available: ${available} ${network.token.symbol}`);
  }

  const actualAmount = withdrawAmount === 0n ? availableFeesAmount : withdrawAmount;
  const formattedAmount = ethers.formatUnits(actualAmount, network.token.decimals);

  // Execute withdrawal
  updateStatus(`Withdrawing ${formattedAmount} ${network.token.symbol}...`);
  logger.info('Initiating fee withdrawal:', { network: network.alias, amount: actualAmount.toString(), treasury });

  let receipt;
  try {
    let tx;
    // New ABI: withdrawFees(token, to, amount)
    if (!network.supports1559) {
      // Legacy transaction for non-EIP-1559 networks (e.g., Mezo)
      const feeData = await provider.getFeeData();
      const gasPrice = feeData.gasPrice && feeData.gasPrice > 0n
        ? feeData.gasPrice
        : ethers.parseUnits('1', 'gwei');

      tx = await signer.sendTransaction({
        to: network.contracts.escrow,
        from: address,
        data: escrowContract.interface.encodeFunctionData('withdrawFees', [tokenAddress, treasury, withdrawAmount]),
        type: 0,
        gasPrice,
        gasLimit: 100000,
        chainId: network.chainId,
        value: 0
      });
    } else {
      tx = await escrowContract.withdrawFees(tokenAddress, treasury, withdrawAmount);
    }

    updateStatus('Waiting for confirmation...');
    receipt = await tx.wait();
  } catch (err) {
    logger.error('Fee withdrawal transaction failed:', err);
    throw new Error(mapContractError(err));
  }

  logger.info('Fee withdrawal complete:', { txHash: receipt.hash, amount: actualAmount.toString() });
  updateStatus(`Withdrawn ${formattedAmount} ${network.token.symbol}!`, 'success');

  return {
    success: true,
    txHash: receipt.hash,
    blockNumber: receipt.blockNumber,
    amount: actualAmount.toString(),
    formattedAmount,
    treasury,
    network: { alias: network.alias, name: network.name, tokenSymbol: network.token.symbol }
  };
}
