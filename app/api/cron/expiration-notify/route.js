import { logger } from '@/lib/logger';
import { notifyExpiredBounties } from '@/integrations/email/expirationNotifier';

// This endpoint can be called by Vercel Cron or any scheduler.
// Set up in vercel.json with a cron expression.
//
// Authentication FAILS CLOSED. This endpoint sends email to every sponsor with
// an expiring bounty, so an unauthenticated caller could use it as a mailing
// cannon — spamming users and burning the sending domain's reputation.
// Previously the secret check was skipped entirely when CRON_SECRET was unset,
// leaving the endpoint publicly invocable.
const CRON_SECRET = process.env.CRON_SECRET;

export async function GET(request) {
  try {
    if (!CRON_SECRET) {
      logger.error('[cron/expiration-notify] CRON_SECRET is not configured; refusing to run');
      return Response.json({ error: 'Not configured' }, { status: 503 });
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
      error: 'Expiration notification check failed'
    }, { status: 500 });
  }
}

