import { createClient } from '@supabase/supabase-js'
import { fetchGitHubRepos } from '@/lib/github'

export const dynamic = 'force-dynamic'

export async function GET(request) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) {
      console.error('[/api/github/repos] Missing Authorization header')
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify the Supabase JWT is valid
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      { global: { headers: { Authorization: `Bearer ${token}` } } }
    )
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      console.error('[/api/github/repos] Invalid JWT:', userError?.message)
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // GitHub token must be passed from the client since provider_token is not in the JWT
    const githubToken = request.headers.get('x-github-token')
    if (!githubToken) {
      console.error('[/api/github/repos] Missing X-GitHub-Token header for user:', user.id)
      return Response.json({ error: 'No GitHub token. Please sign in with GitHub.' }, { status: 401 })
    }

    console.log('[/api/github/repos] Fetching repos for user:', user.id)
    const repos = await fetchGitHubRepos(githubToken)

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
    console.error('[/api/github/repos] Error:', error)
    return Response.json({ error: error.message || 'Failed to fetch repositories' }, { status: 500 })
  }
}
