import { prisma } from './client.js';
import { CONFIG } from '../../config.js';

/**
 * Database queries for analytics and statistics
 */

export async function getAllStats(limit = 20) {
  const environment = CONFIG.envTarget || 'stage';

  // Get token stats with aggregations
  const tokenStats = await prisma.$queryRaw`
    SELECT 
      token,
      COUNT(*)::int as count,
      SUM(CAST(amount AS NUMERIC)) as total_value,
      AVG(CAST(amount AS NUMERIC)) as avg_amount,
      SUM(CASE WHEN status = 'open' THEN CAST(amount AS NUMERIC) ELSE 0 END) as tvl,
      SUM(CASE WHEN status = 'resolved' THEN 1 ELSE 0 END)::int as resolved_count
    FROM bounties
    WHERE environment = ${environment}
    GROUP BY token
  `;

  // Get recent activity
  const recent = await prisma.bounty.findMany({
    where: { environment },
    select: {
      bountyId: true,
      token: true,
      amount: true,
      status: true,
      createdAt: true,
      repoFullName: true,
      issueNumber: true,
      environment: true
    },
    orderBy: { createdAt: 'desc' },
    take: limit
  });

  // Calculate overall stats
  const total_tvl = tokenStats.reduce((sum, t) => {
    const tokenAddress = t.token.toLowerCase();
    const tokenKey = Object.keys(CONFIG.tokens).find(key => key.toLowerCase() === tokenAddress);
    const tokenConfig = tokenKey ? CONFIG.tokens[tokenKey] : undefined;
    const decimals = tokenConfig?.decimals ?? 18;
    const normalizedTvl = Number(t.tvl) / Math.pow(10, decimals);
    return sum + normalizedTvl;
  }, 0);

  const overall = {
    total_bounties: tokenStats.reduce((sum, t) => sum + Number(t.count), 0),
    total_tvl,
    resolved_count: tokenStats.reduce((sum, t) => sum + Number(t.resolved_count), 0)
  };

  // Convert BigInt to numbers in recent
  const recentConverted = recent.map(r => ({
    ...r,
    createdAt: Number(r.createdAt)
  }));

  return { tokenStats, recent: recentConverted, overall };
}
