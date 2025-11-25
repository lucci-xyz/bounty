import { logger } from '@/shared/lib/logger';
import { getSession } from '@/shared/lib/session';
import { NextResponse } from 'next/server';
import { ethers } from 'ethers';
import { REGISTRY } from '@/shared/config/chain-registry';

// Admin check - same pattern as /api/admin/check
const ADMIN_GITHUB_IDS = (process.env.ADMIN_GITHUB_IDS || '')
  .split(',')
  .map(id => id.trim())
  .filter(id => id)
  .map(id => BigInt(id));

// Extended ABI for fee-related functions
const FEE_ABI = [
  'function availableFees() external view returns (uint256)',
  'function totalFeesAccrued() external view returns (uint256)',
  'function feeBps() external view returns (uint16)'
];

/**
 * GET /api/admin/fees
 * Returns fee balances for all configured networks
 * Admin-only endpoint
 */
export async function GET() {
  try {
    const session = await getSession();
    
    if (!session.githubId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    
    const isAdmin = ADMIN_GITHUB_IDS.includes(BigInt(session.githubId));
    if (!isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const networkFees = [];

    // Fetch fees from each configured network
    for (const alias of Object.keys(REGISTRY)) {
      const network = REGISTRY[alias];
      
      try {
        const provider = new ethers.JsonRpcProvider(network.rpcUrl);
        const escrowContract = new ethers.Contract(
          network.contracts.escrow,
          FEE_ABI,
          provider
        );

        // Fetch all fee-related data in parallel
        const [availableFees, totalFeesAccrued, feeBps] = await Promise.all([
          escrowContract.availableFees(),
          escrowContract.totalFeesAccrued(),
          escrowContract.feeBps()
        ]);

        // Format amounts for display
        const decimals = network.token.decimals;
        const availableFormatted = ethers.formatUnits(availableFees, decimals);
        const totalAccruedFormatted = ethers.formatUnits(totalFeesAccrued, decimals);

        networkFees.push({
          alias,
          name: network.name,
          chainId: network.chainId,
          escrowAddress: network.contracts.escrow,
          token: {
            symbol: network.token.symbol,
            decimals: network.token.decimals
          },
          fees: {
            available: availableFees.toString(),
            availableFormatted,
            totalAccrued: totalFeesAccrued.toString(),
            totalAccruedFormatted,
            feeBps: Number(feeBps)
          }
        });
      } catch (error) {
        logger.error(`Failed to fetch fees for ${alias}:`, error.message);
        networkFees.push({
          alias,
          name: network.name,
          chainId: network.chainId,
          escrowAddress: network.contracts.escrow,
          token: {
            symbol: network.token.symbol,
            decimals: network.token.decimals
          },
          fees: null,
          error: error.message
        });
      }
    }

    return NextResponse.json({
      success: true,
      networks: networkFees
    });
  } catch (error) {
    logger.error('Error fetching admin fees:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch fees' },
      { status: 500 }
    );
  }
}

