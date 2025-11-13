import { statsQueries } from '@/server/db/prisma';
import { CONFIG } from '@/server/config';

export async function GET() {
  try {
    const { tokenStats, recent, overall } = await statsQueries.getAll(20);

    // Build token comparison object
    const byToken = {};
    tokenStats.forEach(token => {
      const tokenAddress = token.token.toLowerCase();
      const tokenKey = Object.keys(CONFIG.tokens).find(key => key.toLowerCase() === tokenAddress);
      const tokenConfig = tokenKey ? CONFIG.tokens[tokenKey] : undefined;
      const decimals = tokenConfig?.decimals ?? 18;
      
      byToken[tokenAddress] = {
        count: token.count,
        totalValue: Number(token.total_value) / Math.pow(10, decimals),
        tvl: Number(token.tvl) / Math.pow(10, decimals),
        avgAmount: Number(token.avg_amount) / Math.pow(10, decimals),
        successRate: token.count > 0 ? (token.resolved_count / token.count) * 100 : 0
      };
    });

    // Calculate overall metrics
    const overallMetrics = {
      totalBounties: overall.total_bounties,
      totalTVL: overall.total_tvl,
      avgResolutionRate: overall.total_bounties > 0
        ? (overall.resolved_count / overall.total_bounties) * 100
        : 0
    };

    return Response.json({
      byToken,
      overall: overallMetrics,
      recent,
      timestamp: Date.now()
    });
  } catch (error) {
    console.error('Error generating stats:', error);
    return Response.json({ error: 'Failed to generate stats' }, { status: 500 });
  }
}

