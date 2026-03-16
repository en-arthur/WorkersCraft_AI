import { createClient } from '@supabase/supabase-js'

export async function POST(request) {
  try {
    const { name, description, isPrivate = false } = await request.json()
    if (!name) return Response.json({ error: 'name is required' }, { status: 400 })

    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const githubToken = request.headers.get('x-github-token')
    if (!githubToken) return Response.json({ error: 'No GitHub token. Please sign in with GitHub.' }, { status: 401 })

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      { global: { headers: { Authorization: `Bearer ${token}` } } }
    )
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const res = await fetch('https://api.github.com/user/repos', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${githubToken}`,
        Accept: 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: name.toLowerCase().replace(/\s+/g, '-'),
        description: description || '',
        private: isPrivate,
        auto_init: true,
      }),
    })

    const data = await res.json()
    if (!res.ok) return Response.json({ error: data.message || 'Failed to create repo' }, { status: res.status })

    return Response.json({ repoUrl: data.clone_url, fullName: data.full_name, defaultBranch: data.default_branch })
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }
}
