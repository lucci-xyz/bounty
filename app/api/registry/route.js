import { logger } from '@/lib/logger';
import { NextResponse } from 'next/server';
import { REGISTRY } from '@/config/chain-registry';

/**
 * GET /api/registry
 * Returns the complete network registry configuration
 * This allows client components to access the registry without importing it directly
 */
export async function GET() {
  try {
    return NextResponse.json({
      success: true,
      registry: REGISTRY
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

