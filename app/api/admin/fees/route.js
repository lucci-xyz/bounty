import { logger } from '@/lib/logger';
import { NextResponse } from 'next/server';
import { ethers } from 'ethers';
import { REGISTRY, ABIS } from '@/config/chain-registry';
import { requireAdmin } from '@/server/auth/admin';

/**
 * GET /api/admin/fees
 * Returns protocol fee balances for all configured networks and all tokens.
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

        // Get fee rate and total accrued (shared across all tokens)
        const [totalFeesAccrued, feeBps, owner] = await Promise.all([
          escrow.totalFeesAccrued(),
          escrow.feeBps(),
          escrow.owner()
        ]);

        // Collect all tokens (primary + additional)
        const allTokens = [
          network.token,
          ...(network.additionalTokens || [])
        ];

        // Fetch available fees for each token
        const tokenFees = await Promise.all(
          allTokens.map(async (token) => {
            try {
              const availableFees = await escrow.availableFees(token.address);
              return {
                address: token.address,
                symbol: token.symbol,
                decimals: token.decimals,
                available: availableFees.toString(),
                availableFormatted: ethers.formatUnits(availableFees, token.decimals),
              };
            } catch (err) {
              logger.warn(`Failed to fetch fees for ${token.symbol} on ${alias}:`, err.message);
              return {
                address: token.address,
                symbol: token.symbol,
                decimals: token.decimals,
                available: '0',
                availableFormatted: '0',
                error: err.message
              };
            }
          })
        );

        return {
          alias,
          name: network.name,
          chainId: network.chainId,
          escrowAddress: network.contracts.escrow,
          supports1559: network.supports1559,
          owner,
          fees: {
            totalAccrued: totalFeesAccrued.toString(),
            totalAccruedFormatted: ethers.formatUnits(totalFeesAccrued, network.token.decimals),
            feeBps: Number(feeBps),
            tokens: tokenFees
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
