import { createClient } from '@supabase/supabase-js'
import { fetchRepoBranches, parseGitHubUrl } from '@/lib/github'

export const dynamic = 'force-dynamic'

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const repoUrl = searchParams.get('repo_url')
    if (!repoUrl) {
      return Response.json({ error: 'repo_url is required' }, { status: 400 })
    }

    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) {
      console.error('[/api/github/branches] Missing Authorization header')
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      { global: { headers: { Authorization: `Bearer ${token}` } } }
    )
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      console.error('[/api/github/branches] Invalid JWT:', userError?.message)
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const githubToken = request.headers.get('x-github-token')
    if (!githubToken) {
      console.error('[/api/github/branches] Missing X-GitHub-Token for user:', user.id)
      return Response.json({ error: 'No GitHub token. Please sign in with GitHub.' }, { status: 401 })
    }

    const { owner, repo } = parseGitHubUrl(repoUrl)
    console.log(`[/api/github/branches] Fetching branches for ${owner}/${repo}`)
    const branches = await fetchRepoBranches(githubToken, owner, repo)

    return Response.json({
      branches: branches.map(b => ({
        name: b.name,
        protected: b.protected,
        commit: { sha: b.commit.sha, url: b.commit.url },
      }))
    })
  } catch (error) {
    console.error('[/api/github/branches] Error:', error)
    return Response.json({ error: error.message || 'Failed to fetch branches' }, { status: 500 })
  }
}
