import { logger } from '@/lib/logger';
import { prisma } from '@/server/db/prisma';
import { NextResponse } from 'next/server';
import { sendBetaApprovedEmail, sendBetaRejectedEmail } from '@/integrations/email/email';
import { getLinkHref } from '@/config/links';
import { requireAdmin } from '@/server/auth/admin';

export async function POST(request) {
  try {
    const auth = await requireAdmin();
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }
    
    const { githubId, status } = await request.json();
    
    if (!githubId || !status) {
      return NextResponse.json(
        { error: 'Invalid request parameters' },
        { status: 400 }
      );
    }
    
    // Get user's beta access record
    const betaAccess = await prisma.betaAccess.findUnique({
      where: { githubId: BigInt(githubId) }
    });
    
    if (!betaAccess) {
      return NextResponse.json(
        { error: 'Beta access record not found' },
        { status: 404 }
      );
    }
    
    // Send email notification to user
    logger.info(`[NOTIFICATION] Sending ${status} notification to ${betaAccess.githubUsername} (${betaAccess.email})`);
    
    // Get frontend URL from environment
    const frontendUrl = process.env.FRONTEND_URL || getLinkHref('app', 'marketingSite');
    
    // Send email if user has provided an email address
    let emailResult = { skipped: true, reason: 'no_email' };
    if (betaAccess.email) {
      const sendEmail = status === 'approved' ? sendBetaApprovedEmail : sendBetaRejectedEmail;
      emailResult = await sendEmail({
        to: betaAccess.email,
        username: betaAccess.githubUsername,
        frontendUrl
      });
    } else {
      logger.warn(`[NOTIFICATION] No email address for user ${betaAccess.githubUsername}`);
    }
    
    return NextResponse.json({
      success: true,
      message: 'Notification sent successfully',
      emailSent: emailResult.success === true,
      emailSkipped: emailResult.skipped === true,
      recipient: betaAccess.email || null
    });
  } catch (error) {
    logger.error('Error sending notification:', error);
    return NextResponse.json(
      { error: 'Failed to send notification' },
      { status: 500 }
    );
  }
}

