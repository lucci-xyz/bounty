import { logger } from '@/lib/logger';
import { cookies } from 'next/headers';
import { NETWORK_ENV_COOKIE } from '@/lib/network';
import { newErrorRef, publicErrorMessage } from '@/lib/errorRef';
import { getDefaultAliasForGroup } from '@/config/chain-registry';

export async function POST(request) {
  try {
    const { env } = await request.json();
    
    // Validate env value
    if (!['mainnet', 'testnet'].includes(env)) {
      return Response.json(
        { error: 'Invalid env value. Must be "mainnet" or "testnet".' },
        { status: 400 }
      );
    }

    // Verify that the requested group has at least one configured network
    try {
      getDefaultAliasForGroup(env);
    } catch (error) {
      logger.warn(`No ${env} networks configured:`, error);
      return Response.json(
        { error: `No ${env} networks configured` },
        { status: 400 }
      );
    }

    // Set cookie (await in Next.js 15)
    const cookieStore = await cookies();
    cookieStore.set(NETWORK_ENV_COOKIE, env, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 365, // 1 year
      path: '/'
    });

    return Response.json({ 
      success: true, 
      env 
    });
  } catch (error) {
    const ref = newErrorRef();
    logger.error(`[${ref}] Error setting network env:`, error);
    return Response.json(
      { error: publicErrorMessage(ref), ref },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const cookieStore = await cookies();
    const env = cookieStore.get(NETWORK_ENV_COOKIE)?.value || 'mainnet';
    
    return Response.json({ env });
  } catch (error) {
    const ref = newErrorRef();
    logger.error(`[${ref}] Error getting network env:`, error);
    return Response.json(
      { error: publicErrorMessage(ref), ref },
      { status: 500 }
    );
  }
}

