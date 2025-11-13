import { walletQueries } from '@/server/db/postgres';

export async function GET(request, { params }) {
  try {
    const { githubId } = await params;
    const mapping = await walletQueries.findByGithubId(parseInt(githubId));

    if (!mapping) {
      return Response.json({ error: 'Wallet not found' }, { status: 404 });
    }

    return Response.json(mapping);
  } catch (error) {
    console.error('Error fetching wallet:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}

