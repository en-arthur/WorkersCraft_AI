import { createClient } from '@supabase/supabase-js'
import { getGitHubToken, fetchRepoBranches, parseGitHubUrl } from '@/lib/github'

function getSupabaseWithAuth(token) {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  )
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const repoUrl = searchParams.get('repo_url')

    if (!repoUrl) {
      return Response.json({ error: 'repo_url is required' }, { status: 400 })
    }

    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = getSupabaseWithAuth(token)
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse repo URL
    const { owner, repo } = parseGitHubUrl(repoUrl)

    // Get GitHub token
    const githubToken = getGitHubToken(session)

    // Fetch branches
    const branches = await fetchRepoBranches(githubToken, owner, repo)

    const formattedBranches = branches.map(branch => ({
      name: branch.name,
      protected: branch.protected,
      commit: {
        sha: branch.commit.sha,
        url: branch.commit.url,
      },
    }))

    return Response.json({ branches: formattedBranches })
  } catch (error) {
    console.error('GitHub branches error:', error)
    return Response.json(
      { error: error.message || 'Failed to fetch branches' },
      { status: 500 }
    )
  }
}
