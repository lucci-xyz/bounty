import { logger } from '@/shared/lib/logger';
import './schema';
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { ethers } from 'ethers';
import { CONFIG } from '@/shared/server/config';

/**
 * GET /api/resolver?network=ALIAS
 * Returns the resolver wallet address for a specific network
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const alias = searchParams.get('network');
    
    if (!alias) {
      return NextResponse.json(
        { success: false, error: 'Network alias parameter is required' },
        { status: 400 }
      );
    }

    // Get resolver wallet for this alias
    let resolverAddress;
    const aliasWallet = CONFIG.blockchain.walletsByAlias?.[alias];
    
    // Try to get address from env var first
    if (aliasWallet?.address) {
      resolverAddress = aliasWallet.address;
    } 
    // Otherwise derive from private key
    else if (aliasWallet?.privateKey) {
      const wallet = new ethers.Wallet(aliasWallet.privateKey);
      resolverAddress = wallet.address;
    }
    
    if (!resolverAddress) {
      return NextResponse.json(
        { 
          success: false, 
          error: `No resolver configured for network ${alias}. Set ${alias}_OWNER_WALLET and ${alias}_OWNER_PRIVATE_KEY.` 
        },
        { status: 500 }
      );
    }

    logger.info(`Resolver address for ${alias}: ${resolverAddress}`);

    return NextResponse.json({
      success: true,
      resolver: resolverAddress,
      network: alias
    });
  } catch (error) {
    logger.error('Error fetching resolver address:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to get resolver address' 
      },
      { status: 500 }
    );
  }
}

