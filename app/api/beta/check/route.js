import { logger } from '@/lib/logger';
import { getSession } from '@/lib/session';
import { prisma } from '@/server/db/prisma';
import { getFlagValue } from '@/lib/flags';
import { NextResponse } from 'next/server';

// List of admin GitHub IDs - admins automatically get beta access
const ADMIN_GITHUB_IDS = (process.env.ADMIN_GITHUB_IDS || '')
  .split(',')
  .map(id => id.trim())
  .filter(id => id)
  .map(id => BigInt(id));

export async function GET() {
  try {
    const session = await getSession();
    const betaProgramEnabled = await getFlagValue('betaProgramEnabled');
    
    if (!session.githubId) {
      return NextResponse.json({ 
        hasAccess: false, 
        needsAuth: true,
        betaProgramEnabled
      });
    }

    if (!betaProgramEnabled) {
      return NextResponse.json({
        hasAccess: true,
        status: 'disabled',
        betaProgramEnabled
      });
    }
    
    // Admins automatically have beta access
    const isAdmin = ADMIN_GITHUB_IDS.includes(BigInt(session.githubId));
    if (isAdmin) {
      return NextResponse.json({
        hasAccess: true,
        status: 'approved',
        isAdmin: true,
        betaProgramEnabled
      });
    }
    
    // Check if user has beta access
    const betaAccess = await prisma.betaAccess.findUnique({
      where: { githubId: BigInt(session.githubId) }
    });
    
    if (!betaAccess) {
      return NextResponse.json({ 
        hasAccess: false,
        needsApplication: true,
        betaProgramEnabled
      });
    }
    
    return NextResponse.json({
      hasAccess: betaAccess.status === 'approved',
      status: betaAccess.status,
      appliedAt: betaAccess.appliedAt.toString(),
      betaProgramEnabled
    });
  } catch (error) {
    logger.error('Error checking beta access:', error);
    return NextResponse.json(
      { error: 'Failed to check beta access' },
      { status: 500 }
    );
  }
}

