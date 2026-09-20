import HomePage from '@/ui/pages/home/HomePage';
import { bountyQueries } from '@/server/db/prisma';
import { toPublicBounties } from '@/lib/publicBounty';
import { filterActiveBounties } from '@/lib/bountyFilter';
import { dummyBounties } from '@/api/data/bounties';
import { logger } from '@/lib/logger';

export const metadata = {
  title: 'Bounties | BountyPay',
  description: 'Browse open bounties and start earning crypto for your open source contributions.',
};

/**
 * Resolves the initial feed on the server so first paint carries content.
 * Mirrors the client refresh path exactly (same queries, same redaction,
 * same filter). Returns null on failure so the client falls back to
 * today's spinner-then-fetch behavior.
 */
async function getInitialBounties() {
  try {
    if (process.env.NEXT_PUBLIC_USE_DUMMY_DATA === 'true') {
      return filterActiveBounties(dummyBounties);
    }
    const bounties = await bountyQueries.findAllOpen();
    return filterActiveBounties(toPublicBounties(bounties));
  } catch (error) {
    logger.error('Error fetching initial bounties:', error);
    return null;
  }
}

export default async function AppHome() {
  const initialBounties = await getInitialBounties();
  return <HomePage initialBounties={initialBounties} />;
}
