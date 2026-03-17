import { createClient } from '@supabase/supabase-js'
import { Sandbox } from 'e2b'

function getSupabaseWithAuth(token) {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  )
}

export async function POST(request, { params }) {
  let sandbox = null
  try {
    const { id } = params
    const { commitMessage } = await request.json()
    if (!commitMessage) return Response.json({ error: 'commitMessage is required' }, { status: 400 })

    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const githubToken = request.headers.get('x-github-token')
    if (!githubToken) return Response.json({ error: 'No GitHub token' }, { status: 401 })

    const supabase = getSupabaseWithAuth(token)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: project } = await supabase.from('projects').select('*').eq('id', id).eq('user_id', user.id).single()
    if (!project) return Response.json({ error: 'Project not found' }, { status: 404 })
    if (!project.github_repo_url || !project.github_branch) {
      return Response.json({ error: 'Project is not connected to GitHub' }, { status: 400 })
    }

    const { data: latestVersion } = await supabase
      .from('project_versions')
      .select('fragment_data')
      .eq('project_id', id)
      .order('version_number', { ascending: false })
      .limit(1)
      .single()

    if (!latestVersion?.fragment_data?.files) {
      return Response.json({ error: 'No files found in project' }, { status: 400 })
    }

    const username = user.user_metadata?.user_name || user.user_metadata?.preferred_username || 'user'
    const name = user.user_metadata?.full_name || user.user_metadata?.name || 'User'
    const email = user.email
    const repoPath = '/home/user/repo'

    sandbox = await Sandbox.create()

    await sandbox.git.dangerouslyAuthenticate({ username, password: githubToken })
    await sandbox.git.clone(project.github_repo_url, { path: repoPath, branch: project.github_branch })
    await sandbox.git.configureUser(name, email)

    for (const file of latestVersion.fragment_data.files) {
      const filePath = `${repoPath}/${file.file_path || file.path}`
      const content = file.file_content || file.code || file.content || ''
      await sandbox.files.write(filePath, content)
    }

    await sandbox.git.add(repoPath)
    const status = await sandbox.git.status(repoPath)
    if (status.fileStatus.length === 0) {
      return Response.json({ error: 'No changes to commit' }, { status: 400 })
    }

    await sandbox.git.commit(repoPath, commitMessage, { authorName: name, authorEmail: email })
    await sandbox.git.push(repoPath, {
      username,
      password: githubToken,
      remote: 'origin',
      branch: project.github_branch,
    })

    await supabase.from('projects').update({ github_last_synced_at: new Date().toISOString() }).eq('id', id)

    return Response.json({ success: true, filesChanged: status.fileStatus.length })
  } catch (error) {
    console.error('Push GitHub error:', error)
    return Response.json({ error: error.message || 'Failed to push to GitHub' }, { status: 500 })
  } finally {
    if (sandbox) await sandbox.kill().catch(console.error)
  }
}
