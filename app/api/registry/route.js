import { logger } from '@/lib/logger';
import { NextResponse } from 'next/server';
import { REGISTRY } from '@/config/chain-registry';
import { getFlagValue } from '@/lib/flags';

/**
 * GET /api/registry
 * Returns the complete network registry configuration
 * This allows client components to access the registry without importing it directly
 */
export async function GET() {
  try {
    let includeTestnets = false;
    try {
      includeTestnets = await getFlagValue('testnetNetworks');
    } catch (flagError) {
      logger.warn('Unable to evaluate testnet flag; defaulting to hidden.', flagError);
    }

    const registryPayload = includeTestnets
      ? REGISTRY
      : Object.fromEntries(
          Object.entries(REGISTRY).filter(([, config]) => config.group !== 'testnet')
        );

    return NextResponse.json({
      success: true,
      registry: registryPayload
    });
  } catch (error) {
    logger.error('Error fetching registry:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to load network registry' 
      },
      { status: 500 }
    );
  }
}

