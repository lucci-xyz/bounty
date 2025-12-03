import { logger } from '@/lib/logger';
import { getSession } from '@/lib/session';
import { isValidEmail } from '@/lib/validation';
import { prisma } from '@/server/db/prisma';
import { NextResponse } from 'next/server';
import { sendBetaReceivedEmail } from '@/integrations/email/email';
import { getLinkHref } from '@/config/links';

export async function POST(request) {
  try {
    const session = await getSession();
    
    if (!session.githubId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    // Parse request body to get email
    const body = await request.json().catch(() => ({}));
    const email = body.email?.trim();
    
    // Validate email is provided
    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }
    
    // Validate email format
    if (!isValidEmail(email)) {
      return NextResponse.json(
        { error: 'Please provide a valid email address' },
        { status: 400 }
      );
    }
    
    // Check if user already applied
    const existing = await prisma.betaAccess.findUnique({
      where: { githubId: BigInt(session.githubId) }
    });
    
    if (existing) {
      // Update email if it's different
      if (existing.email !== email) {
        await prisma.betaAccess.update({
          where: { githubId: BigInt(session.githubId) },
          data: { email }
        });
      }
      
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
        email,
        status: 'pending',
        appliedAt: BigInt(Date.now())
      }
    });
    
    // Send beta application received email (non-blocking)
    const frontendUrl = process.env.FRONTEND_URL || getLinkHref('app', 'marketingSite');
    sendBetaReceivedEmail({
      to: email,
      username: session.githubUsername,
      frontendUrl
    }).catch((emailError) => {
      logger.warn('Failed to send beta received email:', emailError.message);
    });
    
    return NextResponse.json({
      success: true,
      status: 'pending',
      appliedAt: betaAccess.appliedAt.toString()
    });
  } catch (error) {
    logger.error('Error applying for beta:', error);
    return NextResponse.json(
      { error: 'Failed to apply for beta access' },
      { status: 500 }
    );
  }
}

