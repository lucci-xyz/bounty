import { bountyQueries } from '@/server/db/index';

export async function GET(request, { params }) {
  try {
    const { repoId, issueNumber } = await params;
    const bounties = bountyQueries.findByIssue(parseInt(repoId), parseInt(issueNumber));

    return Response.json({ bounties });
  } catch (error) {
    console.error('Error fetching issue bounties:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}

