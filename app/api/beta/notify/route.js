import { getSession } from '@/lib/session';
import { prisma } from '@/server/db/prisma';
import { NextResponse } from 'next/server';

// List of admin GitHub IDs - configure in environment
const ADMIN_GITHUB_IDS = (process.env.ADMIN_GITHUB_IDS || '')
  .split(',')
  .map(id => id.trim())
  .filter(id => id)
  .map(id => BigInt(id));

export async function POST(request) {
  try {
    const session = await getSession();
    
    if (!session.githubId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    // Check if user is admin
    if (!ADMIN_GITHUB_IDS.includes(BigInt(session.githubId))) {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 403 }
      );
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
    
    // TODO: Implement actual notification system
    // This could integrate with:
    // - Email service (SendGrid, AWS SES, etc.)
    // - In-app notifications
    // - GitHub notifications
    // For now, this is a placeholder that logs the notification
    
    console.log(`[NOTIFICATION] Sending ${status} notification to ${betaAccess.githubUsername} (${betaAccess.email})`);
    
    // Example email notification structure:
    const notificationData = {
      to: betaAccess.email,
      subject: status === 'approved' 
        ? 'Welcome to BountyPay Beta!' 
        : 'BountyPay Beta Application Update',
      template: status === 'approved' ? 'beta-approved' : 'beta-rejected',
      data: {
        username: betaAccess.githubUsername,
        status: status
      }
    };
    
    // In a real implementation, you would call your email service here
    // await sendEmail(notificationData);
    
    return NextResponse.json({
      success: true,
      message: 'Notification sent successfully',
      notificationData
    });
  } catch (error) {
    console.error('Error sending notification:', error);
    return NextResponse.json(
      { error: 'Failed to send notification' },
      { status: 500 }
    );
  }
}

