import { getSession } from '@/lib/session';
import { prisma } from '@/server/db/prisma';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const session = await getSession();
    
    if (!session.githubId) {
      return NextResponse.json({ 
        hasAccess: false, 
        needsAuth: true 
      });
    }
    
    // Check if user has beta access
    const betaAccess = await prisma.betaAccess.findUnique({
      where: { githubId: BigInt(session.githubId) }
    });
    
    if (!betaAccess) {
      return NextResponse.json({ 
        hasAccess: false,
        needsApplication: true
      });
    }
    
    return NextResponse.json({
      hasAccess: betaAccess.status === 'approved',
      status: betaAccess.status,
      appliedAt: betaAccess.appliedAt.toString()
    });
  } catch (error) {
    console.error('Error checking beta access:', error);
    return NextResponse.json(
      { error: 'Failed to check beta access' },
      { status: 500 }
    );
  }
}

