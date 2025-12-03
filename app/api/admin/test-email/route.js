import { logger } from '@/lib/logger';
import { getSession } from '@/lib/session';
import {
  sendPrOpenedEmail,
  sendBountyExpiredEmail,
  sendErrorNotification,
  sendBetaReceivedEmail,
  sendBetaApprovedEmail,
  sendBetaRejectedEmail
} from '@/integrations/email/email';
import { isSmtpConfigured } from '@/integrations/email/smtp';

// Admin GitHub IDs from environment
const ADMIN_GITHUB_IDS = (process.env.ADMIN_GITHUB_IDS || '')
  .split(',')
  .map(id => id.trim())
  .filter(id => id)
  .map(id => BigInt(id));

const FRONTEND_URL = process.env.FRONTEND_URL || 'https://bountypay.luccilabs.xyz';

export async function POST(request) {
  try {
    // Check authentication
    const session = await getSession();
    
    if (!session?.githubId) {
      return Response.json({ error: 'Authentication required' }, { status: 401 });
    }
    
    // Check if user is admin
    if (!ADMIN_GITHUB_IDS.includes(BigInt(session.githubId))) {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }
    
    // Check if SMTP is configured
    if (!isSmtpConfigured()) {
      return Response.json({ 
        error: 'SMTP not configured',
        details: 'SMTP_USER and SMTP_PASS environment variables are not set'
      }, { status: 503 });
    }
    
    const body = await request.json();
    const { type, ...params } = body;
    
    if (!type) {
      return Response.json({ error: 'Email type is required' }, { status: 400 });
    }
    
    if (!params.to) {
      return Response.json({ error: 'Recipient email is required' }, { status: 400 });
    }
    
    let result;
    
    switch (type) {
      case 'pr-opened':
        result = await sendPrOpenedEmail({
          to: params.to,
          username: params.username || 'testuser',
          prNumber: parseInt(params.prNumber) || 42,
          prTitle: params.prTitle || 'Test PR Title',
          prAuthor: params.prAuthor || 'contributor',
          repoFullName: params.repoFullName || 'owner/repo',
          bountyAmount: params.bountyAmount || '100.00',
          tokenSymbol: params.tokenSymbol || 'USDC',
          issueNumber: parseInt(params.issueNumber) || 1,
          frontendUrl: FRONTEND_URL
        });
        break;
        
      case 'bounty-expired':
        result = await sendBountyExpiredEmail({
          to: params.to,
          username: params.username || 'testuser',
          bountyAmount: params.bountyAmount || '100.00',
          tokenSymbol: params.tokenSymbol || 'USDC',
          issueNumber: parseInt(params.issueNumber) || 1,
          issueTitle: params.issueTitle || 'Test Issue',
          repoFullName: params.repoFullName || 'owner/repo',
          frontendUrl: FRONTEND_URL
        });
        break;
        
      case 'error':
        result = await sendErrorNotification({
          to: params.to,
          username: params.username || 'testuser',
          errorType: params.errorType || 'Test Error',
          errorMessage: params.errorMessage || 'This is a test error message',
          context: params.context || 'Testing error notifications',
          repoFullName: params.repoFullName || 'owner/repo',
          issueNumber: params.issueNumber ? parseInt(params.issueNumber) : undefined,
          prNumber: params.prNumber ? parseInt(params.prNumber) : undefined,
          bountyId: params.bountyId,
          network: params.network,
          frontendUrl: FRONTEND_URL
        });
        break;
        
      case 'beta-received':
        result = await sendBetaReceivedEmail({
          to: params.to,
          username: params.username || 'testuser',
          frontendUrl: FRONTEND_URL
        });
        break;
        
      case 'beta-approved':
        result = await sendBetaApprovedEmail({
          to: params.to,
          username: params.username || 'testuser',
          frontendUrl: FRONTEND_URL
        });
        break;
        
      case 'beta-rejected':
        result = await sendBetaRejectedEmail({
          to: params.to,
          username: params.username || 'testuser',
          frontendUrl: FRONTEND_URL
        });
        break;
        
      default:
        return Response.json({ error: `Unknown email type: ${type}` }, { status: 400 });
    }
    
    logger.info(`[test-email] Sent ${type} email to ${params.to}`, result);
    
    return Response.json({
      success: true,
      type,
      recipient: params.to,
      result
    });
  } catch (error) {
    logger.error('[test-email] Error:', error);
    return Response.json({ 
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
}

