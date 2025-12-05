import { logger } from '@/lib/logger';
import { NextResponse } from 'next/server';
import { ethers } from 'ethers';
import { REGISTRY, ABIS } from '@/config/chain-registry';
import { requireAdmin } from '@/server/auth/admin';

/**
 * GET /api/admin/fees
 * Returns protocol fee balances for all configured networks.
 * Admin-only endpoint - requires authenticated admin session.
 */
export async function GET() {
  try {
    // Verify admin access
    const auth = await requireAdmin();
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const networkFees = [];

    // Fetch fees from each configured network in parallel
    const fetchPromises = Object.keys(REGISTRY).map(async (alias) => {
      const network = REGISTRY[alias];

      try {
        const provider = new ethers.JsonRpcProvider(network.rpcUrl);
        const escrow = new ethers.Contract(network.contracts.escrow, ABIS.escrow, provider);

        // New ABI: availableFees(token) - pass the network's token address
        const [availableFees, totalFeesAccrued, feeBps] = await Promise.all([
          escrow.availableFees(network.token.address),
          escrow.totalFeesAccrued(),
          escrow.feeBps()
        ]);

        return {
          alias,
          name: network.name,
          chainId: network.chainId,
          escrowAddress: network.contracts.escrow,
          supports1559: network.supports1559,
          token: { symbol: network.token.symbol, decimals: network.token.decimals },
          fees: {
            available: availableFees.toString(),
            availableFormatted: ethers.formatUnits(availableFees, network.token.decimals),
            totalAccrued: totalFeesAccrued.toString(),
            totalAccruedFormatted: ethers.formatUnits(totalFeesAccrued, network.token.decimals),
            feeBps: Number(feeBps)
          }
        };
      } catch (error) {
        logger.error(`Failed to fetch fees for ${alias}:`, error.message);
        return {
          alias,
          name: network.name,
          chainId: network.chainId,
          escrowAddress: network.contracts.escrow,
          supports1559: network.supports1559,
          token: { symbol: network.token.symbol, decimals: network.token.decimals },
          fees: null,
          error: error.message
        };
      }
    });

    const results = await Promise.all(fetchPromises);
    networkFees.push(...results);

    return NextResponse.json({ success: true, networks: networkFees });
  } catch (error) {
    logger.error('Error fetching admin fees:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch fees' }, { status: 500 });
  }
}
