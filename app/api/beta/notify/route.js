import './schema';
import { getSession } from '@/lib/session';
import { prisma } from '@/server/db/prisma';
import { NextResponse } from 'next/server';
import { sendUserEmail } from '@/server/notifications/email';
import { betaApprovedTemplate, betaRejectedTemplate } from '@/server/notifications/templates';

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
    
    // Send email notification to user
    console.log(`[NOTIFICATION] Sending ${status} notification to ${betaAccess.githubUsername} (${betaAccess.email})`);
    
    // Get frontend URL from environment
    const frontendUrl = process.env.FRONTEND_URL || 'https://bountypay.luccilabs.xyz';
    
    // Select appropriate template based on status
    const template = status === 'approved' 
      ? betaApprovedTemplate({ username: betaAccess.githubUsername, frontendUrl })
      : betaRejectedTemplate({ username: betaAccess.githubUsername, frontendUrl });
    
    // Send email if user has provided an email address
    let emailResult = { skipped: true, reason: 'no_email' };
    if (betaAccess.email) {
      emailResult = await sendUserEmail({
        to: betaAccess.email,
        subject: template.subject,
        html: template.html,
        text: template.text
      });
    } else {
      console.warn(`[NOTIFICATION] No email address for user ${betaAccess.githubUsername}`);
    }
    
    return NextResponse.json({
      success: true,
      message: 'Notification sent successfully',
      emailSent: emailResult.success === true,
      emailSkipped: emailResult.skipped === true,
      recipient: betaAccess.email || null
    });
  } catch (error) {
    console.error('Error sending notification:', error);
    return NextResponse.json(
      { error: 'Failed to send notification' },
      { status: 500 }
    );
  }
}

