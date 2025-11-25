import { logger } from '@/shared/lib/logger';
import { getSession } from '@/shared/lib/session';
import { NextResponse } from 'next/server';
import { ethers, isAddress } from 'ethers';
import { REGISTRY } from '@/shared/config/chain-registry';
import { CONFIG } from '@/shared/server/config';

// Admin check - same pattern as /api/admin/check
const ADMIN_GITHUB_IDS = (process.env.ADMIN_GITHUB_IDS || '')
  .split(',')
  .map(id => id.trim())
  .filter(id => id)
  .map(id => BigInt(id));

// ABI for withdraw function
const WITHDRAW_ABI = [
  'function withdrawFees(address to, uint256 amount) external',
  'function availableFees() external view returns (uint256)'
];

/**
 * POST /api/admin/fees/withdraw
 * Withdraw accumulated fees from a specific network's escrow contract
 * Admin-only endpoint
 * 
 * Body:
 * - alias: Network alias (e.g., 'BASE_SEPOLIA')
 * - treasury: Address to withdraw fees to
 * - amount: Amount to withdraw (0 = withdraw all available)
 */
export async function POST(request) {
  try {
    const session = await getSession();
    
    if (!session.githubId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    
    const isAdmin = ADMIN_GITHUB_IDS.includes(BigInt(session.githubId));
    if (!isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { alias, treasury, amount = '0' } = body;

    // Validate alias
    if (!alias || !REGISTRY[alias]) {
      return NextResponse.json(
        { error: `Invalid network alias: ${alias}. Available: ${Object.keys(REGISTRY).join(', ')}` },
        { status: 400 }
      );
    }

    // Validate treasury address
    if (!treasury || !isAddress(treasury)) {
      return NextResponse.json(
        { error: 'Invalid treasury address' },
        { status: 400 }
      );
    }

    const network = REGISTRY[alias];
    
    // Get wallet configuration for this network
    const aliasWallet = CONFIG.blockchain.walletsByAlias?.[alias];
    if (!aliasWallet?.privateKey) {
      return NextResponse.json(
        { error: `No owner wallet configured for ${alias}. Set ${alias}_OWNER_WALLET and ${alias}_OWNER_PRIVATE_KEY.` },
        { status: 500 }
      );
    }

    // Create provider and wallet
    const provider = new ethers.JsonRpcProvider(network.rpcUrl);
    const wallet = new ethers.Wallet(aliasWallet.privateKey, provider);
    const escrowContract = new ethers.Contract(
      network.contracts.escrow,
      WITHDRAW_ABI,
      wallet
    );

    // Check available fees before withdrawing
    const availableFees = await escrowContract.availableFees();
    if (availableFees === 0n) {
      return NextResponse.json(
        { error: 'No fees available to withdraw' },
        { status: 400 }
      );
    }

    const withdrawAmount = BigInt(amount);
    if (withdrawAmount > 0n && withdrawAmount > availableFees) {
      return NextResponse.json(
        { error: `Insufficient fees. Available: ${availableFees.toString()}, requested: ${amount}` },
        { status: 400 }
      );
    }

    // Build transaction overrides for networks that don't support EIP-1559
    let txOverrides = {};
    if (!network.supports1559) {
      const gasPrice = await provider.send('eth_gasPrice', []);
      txOverrides = {
        type: 0,
        gasPrice: BigInt(gasPrice)
      };
    }

    logger.info(`Admin fee withdrawal initiated on ${alias}:`, {
      treasury,
      amount: withdrawAmount.toString(),
      availableFees: availableFees.toString(),
      adminGithubId: session.githubId.toString()
    });

    // Execute withdrawal
    const tx = await escrowContract.withdrawFees(treasury, withdrawAmount, txOverrides);
    const receipt = await tx.wait();

    const actualWithdrawn = withdrawAmount === 0n ? availableFees : withdrawAmount;
    const formattedAmount = ethers.formatUnits(actualWithdrawn, network.token.decimals);

    logger.info(`Admin fee withdrawal completed on ${alias}:`, {
      txHash: receipt.hash,
      amount: actualWithdrawn.toString(),
      formattedAmount,
      treasury
    });

    return NextResponse.json({
      success: true,
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      amount: actualWithdrawn.toString(),
      formattedAmount,
      treasury,
      network: {
        alias,
        name: network.name,
        tokenSymbol: network.token.symbol
      }
    });
  } catch (error) {
    logger.error('Error withdrawing admin fees:', error);
    
    // Parse common contract errors
    let errorMessage = error.message || 'Failed to withdraw fees';
    if (error.code === 'CALL_EXCEPTION') {
      errorMessage = 'Transaction reverted. Check owner permissions and available balance.';
    } else if (error.code === 'INSUFFICIENT_FUNDS') {
      errorMessage = 'Insufficient native balance for gas fees.';
    }
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

