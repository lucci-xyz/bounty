import './schema';
import { getSession } from '@/shared/lib/session';
import { prisma } from '@/shared/server/db/prisma';
import { NextResponse } from 'next/server';

export async function POST() {
  try {
    const session = await getSession();
    
    if (!session.githubId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    // Check if user already applied
    const existing = await prisma.betaAccess.findUnique({
      where: { githubId: BigInt(session.githubId) }
    });
    
    if (existing) {
      return NextResponse.json({
        success: true,
        status: existing.status,
        message: existing.status === 'pending' 
          ? 'Application already submitted' 
          : 'You already have a decision on your application'
      });
    }
    
    // Create beta access application
    const betaAccess = await prisma.betaAccess.create({
      data: {
        githubId: BigInt(session.githubId),
        githubUsername: session.githubUsername,
        email: session.email,
        status: 'pending',
        appliedAt: BigInt(Date.now())
      }
    });
    
    return NextResponse.json({
      success: true,
      status: 'pending',
      appliedAt: betaAccess.appliedAt.toString()
    });
  } catch (error) {
    console.error('Error applying for beta:', error);
    return NextResponse.json(
      { error: 'Failed to apply for beta access' },
      { status: 500 }
    );
  }
}

