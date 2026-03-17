import { createClient } from '@supabase/supabase-js'
import { parseGitHubUrl } from '@/lib/github'

export async function GET(request, { params }) {
  try {
    const { id } = params
    const { searchParams } = new URL(request.url)
    const artifactId = searchParams.get('artifact_id')
    const filename = searchParams.get('filename') || 'build.zip'
    const tokenFromQuery = searchParams.get('token')
    const ghTokenFromQuery = searchParams.get('gh_token')

    if (!artifactId) return Response.json({ error: 'artifact_id is required' }, { status: 400 })

    const token = request.headers.get('authorization')?.replace('Bearer ', '') || tokenFromQuery
    if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const githubToken = request.headers.get('x-github-token') || ghTokenFromQuery
    if (!githubToken) return Response.json({ error: 'No GitHub token' }, { status: 401 })

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      { global: { headers: { Authorization: `Bearer ${token}` } } }
    )
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: project } = await supabase.from('projects').select('github_repo_url').eq('id', id).single()
    const { owner, repo } = parseGitHubUrl(project.github_repo_url)

    const res = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/actions/artifacts/${artifactId}/zip`,
      {
        headers: { Authorization: `Bearer ${githubToken}`, Accept: 'application/vnd.github.v3+json' },
        redirect: 'follow',
      }
    )

    if (!res.ok) return Response.json({ error: 'Failed to fetch artifact' }, { status: res.status })

    return new Response(res.body, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }
}
