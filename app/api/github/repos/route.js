import { createClient } from '@supabase/supabase-js'
import { getGitHubToken, fetchGitHubRepos } from '@/lib/github'

function getSupabaseWithAuth(token) {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  )
}

export async function GET(request) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = getSupabaseWithAuth(token)
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get GitHub token from session
    const githubToken = getGitHubToken(session)

    // Fetch repositories
    const repos = await fetchGitHubRepos(githubToken)

    // Filter and format repos
    const formattedRepos = repos.map(repo => ({
      id: repo.id,
      name: repo.name,
      fullName: repo.full_name,
      description: repo.description,
      url: repo.html_url,
      cloneUrl: repo.clone_url,
      defaultBranch: repo.default_branch,
      private: repo.private,
      updatedAt: repo.updated_at,
      language: repo.language,
      owner: {
        login: repo.owner.login,
        avatarUrl: repo.owner.avatar_url,
      },
    }))

    return Response.json({ repos: formattedRepos })
  } catch (error) {
    console.error('GitHub repos error:', error)
    return Response.json(
      { error: error.message || 'Failed to fetch repositories' },
      { status: 500 }
    )
  }
}
