import { logger } from '@/lib/logger';
import { NextResponse } from 'next/server';
import { newErrorRef, publicErrorMessage } from '@/lib/errorRef';
import { getDefaultAliasForGroup } from '@/config/chain-registry';

/**
 * GET /api/network/default?group=testnet|mainnet
 * Returns the default alias for the specified network group
 */
export function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const group = searchParams.get('group') || 'mainnet';

    if (group !== 'mainnet' && group !== 'testnet') {
      return NextResponse.json(
        { success: false, error: 'Invalid group. Must be "mainnet" or "testnet"' },
        { status: 400 }
      );
    }

    const alias = getDefaultAliasForGroup(group);

    return NextResponse.json({
      success: true,
      alias,
      group
    });
  } catch (error) {
    const ref = newErrorRef();
    logger.error(`[${ref}] Error fetching default alias:`, error);
    return NextResponse.json(
      { 
        success: false, 
        error: publicErrorMessage(ref),
        ref
      },
      { status: 500 }
    );
  }
}

