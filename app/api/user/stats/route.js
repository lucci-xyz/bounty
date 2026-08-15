import { logger } from '@/lib/logger';
import { getSession } from '@/lib/session';
import { bountyQueries, prClaimQueries } from '@/server/db/prisma';

export async function GET() {
  try {
    const session = await getSession();
    
    if (!session || !session.githubId) {
      return Response.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const bounties = await bountyQueries.findBySponsor(session.githubId);
    
    const stats = {
      totalBounties: bounties.length,
      openBounties: bounties.filter(b => b.status === 'open').length,
      resolvedBounties: bounties.filter(b => b.status === 'resolved').length,
      refundedBounties: bounties.filter(b => b.status === 'refunded').length,
      totalValueLocked: 0,
      totalValuePaid: 0
    };
    
    // Totals are reported PER TOKEN.
    //
    // These used to be two plain sums across every bounty regardless of token,
    // rendered in the dashboard with a leading "$". One USDC plus one MUSD came
    // out as "$2" — a number denominated in nothing, for a sponsor deciding how
    // much they have at stake.
    const locked = {};
    const paid = {};

    bounties.forEach((b) => {
      const symbol = b.tokenSymbol || 'USDC';
      const decimals = symbol === 'MUSD' ? 18 : 6;
      const value = Number(b.amount) / Math.pow(10, decimals);

      if (b.status === 'open') {
        locked[symbol] = (locked[symbol] || 0) + value;
      } else if (b.status === 'resolved') {
        paid[symbol] = (paid[symbol] || 0) + value;
      }
    });

    const round = (obj) =>
      Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, Math.round(v * 100) / 100]));

    stats.valueLockedByToken = round(locked);
    stats.valuePaidByToken = round(paid);

    // Retained for callers that have not moved to the per-token fields. Only
    // meaningful when a sponsor uses a single token, which is the common case.
    const lockedSymbols = Object.keys(stats.valueLockedByToken);
    const paidSymbols = Object.keys(stats.valuePaidByToken);
    stats.totalValueLocked = lockedSymbols.length === 1 ? stats.valueLockedByToken[lockedSymbols[0]] : null;
    stats.totalValuePaid = paidSymbols.length === 1 ? stats.valuePaidByToken[paidSymbols[0]] : null;

    // Count unique contributors who were paid for resolved bounties
    const resolvedBountyIds = bounties
      .filter(b => b.status === 'resolved')
      .map(b => b.bountyId);
    
    const uniqueContributors = await prClaimQueries.countUniquePaidContributors(resolvedBountyIds);
    
    // Replace resolvedBounties count with unique contributors count
    stats.resolvedBounties = uniqueContributors;

    return Response.json(stats);
  } catch (error) {
    logger.error('Error fetching user stats:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}

