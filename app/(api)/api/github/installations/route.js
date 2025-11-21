import './schema';
import { getSession } from '@/shared/lib/session';
import { getGitHubApp } from '@/shared/server/github/client';

export async function GET(request) {
  try {
    const session = await getSession();
    
    if (!session || !session.githubId) {
      return Response.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const app = getGitHubApp();
    
    // Get all installations for the authenticated user
    const { data: installations } = await app.octokit.request('GET /user/installations', {
      headers: {
        authorization: `token ${session.githubAccessToken}`
      }
    });

    // For each installation, get the list of repositories
    const allRepos = [];
    
    for (const installation of installations.installations) {
      try {
        const { data: reposData } = await app.octokit.request('GET /user/installations/{installation_id}/repositories', {
          installation_id: installation.id,
          headers: {
            authorization: `token ${session.githubAccessToken}`
          }
        });
        
        reposData.repositories.forEach(repo => {
          allRepos.push({
            id: repo.id,
            name: repo.name,
            fullName: repo.full_name,
            owner: repo.owner.login,
            installationId: installation.id
          });
        });
      } catch (error) {
        console.error(`Error fetching repos for installation ${installation.id}:`, error);
      }
    }

    return Response.json({ repositories: allRepos });
  } catch (error) {
    console.error('Error fetching GitHub installations:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}

