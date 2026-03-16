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
    const { repoUrl, branch } = await request.json()

    if (!repoUrl || !branch) {
      return Response.json({ error: 'repoUrl and branch are required' }, { status: 400 })
    }

    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const githubToken = request.headers.get('x-github-token')
    if (!githubToken) return Response.json({ error: 'No GitHub token. Please sign in with GitHub.' }, { status: 401 })

    const supabase = getSupabaseWithAuth(token)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (projectError || !project) return Response.json({ error: 'Project not found' }, { status: 404 })

    const username = user.user_metadata?.user_name || user.user_metadata?.preferred_username || 'user'
    const name = user.user_metadata?.full_name || user.user_metadata?.name || 'User'
    const email = user.email

    sandbox = await Sandbox.create()

    const { data: latestVersion } = await supabase
      .from('project_versions')
      .select('fragment_data')
      .eq('project_id', id)
      .order('version_number', { ascending: false })
      .limit(1)
      .single()

    if (latestVersion?.fragment_data?.files) {
      for (const file of latestVersion.fragment_data.files) {
        await sandbox.files.write(file.file_path, file.file_content || file.code || '')
      }
    } else {
      // Ensure at least one file so commit is not empty
      await sandbox.files.write('/home/user/.gitkeep', '')
    }

    const repoPath = '/home/user'

    await sandbox.git.init(repoPath)
    await sandbox.git.configureUser(name, email)
    await sandbox.git.remoteAdd(repoPath, 'origin', repoUrl, { overwrite: true })
    // Add .gitignore to exclude .git-credentials before staging
    await sandbox.commands.run(`echo '.git-credentials' >> ${repoPath}/.gitignore`, { timeoutMs: 5000 })
    await sandbox.git.add(repoPath)
    await sandbox.git.commit(repoPath, 'Initial commit from WorkersCraft', {
      authorName: name,
      authorEmail: email,
      allowEmpty: true,
    })
    await sandbox.commands.run(`cd ${repoPath} && git branch -M ${branch}`, { timeoutMs: 10000 })
    // Authenticate AFTER commit so credentials file is never staged
    await sandbox.git.dangerouslyAuthenticate({ username, password: githubToken })
    await sandbox.commands.run(
      `cd ${repoPath} && git push --force -u origin ${branch}`,
      { timeoutMs: 60000 }
    )

    const { error: updateError } = await supabase
      .from('projects')
      .update({
        github_repo_url: repoUrl,
        github_branch: branch,
        github_last_synced_at: new Date().toISOString(),
      })
      .eq('id', id)

    if (updateError) throw new Error(`Failed to update project: ${updateError.message}`)

    return Response.json({ success: true, github_repo_url: repoUrl, github_branch: branch })
  } catch (error) {
    console.error('Connect GitHub error:', error)
    return Response.json({ error: error.message || 'Failed to connect repository' }, { status: 500 })
  } finally {
    if (sandbox) await sandbox.kill().catch(console.error)
  }
}
