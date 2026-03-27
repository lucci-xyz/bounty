import { logger } from '@/lib/logger';
import { notifyExpiredBounties } from '@/integrations/email/expirationNotifier';

// This endpoint can be called by Vercel Cron or any scheduler
// Set up in vercel.json with a cron expression

// Verify the request is from Vercel Cron (optional security)
const CRON_SECRET = process.env.CRON_SECRET;

export async function GET(request) {
  try {
    // Verify cron secret - always required to prevent unauthorized invocations
    if (!CRON_SECRET) {
      logger.error('[cron/expiration-notify] CRON_SECRET not configured');
      return Response.json({ error: 'Cron endpoint not configured' }, { status: 503 });
    }
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${CRON_SECRET}`) {
      logger.warn('[cron/expiration-notify] Unauthorized cron request');
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    logger.info('[cron/expiration-notify] Starting expiration notification check');
    
    const stats = await notifyExpiredBounties();
    
    return Response.json({
      success: true,
      message: 'Expiration notification check complete',
      stats
    });
  } catch (error) {
    logger.error('[cron/expiration-notify] Error:', error.message);
    return Response.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}

