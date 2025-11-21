import './schema';
import { NextResponse } from 'next/server';
import { getDefaultAliasForGroup } from '@/config/chain-registry';

/**
 * GET /api/network/default?group=testnet|mainnet
 * Returns the default alias for the specified network group
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const group = searchParams.get('group') || 'testnet';

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
    console.error('Error fetching default alias:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to get default network alias' 
      },
      { status: 500 }
    );
  }
}

