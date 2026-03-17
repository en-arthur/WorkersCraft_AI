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

    const isDev = process.env.NODE_ENV === 'development'
    const templateId = isDev ? 'expo-developer-dev' : 'expo-developer'
    sandbox = await Sandbox.create(templateId)

    const { data: latestVersion } = await supabase
      .from('project_versions')
      .select('fragment_data')
      .eq('project_id', id)
      .order('version_number', { ascending: false })
      .limit(1)
      .single()

    const repoPath = '/home/user/project'
    await sandbox.commands.run(`mkdir -p ${repoPath}`, { timeoutMs: 5000 })

    // Copy full Expo scaffold from sandbox home into project dir (exclude project dir itself)
    await sandbox.commands.run(
      `find /home/user -maxdepth 1 ! -name 'project' ! -path '/home/user' -exec cp -r {} ${repoPath}/ \\;`,
      { timeoutMs: 30000 }
    )

    // Append sandbox dotfile exclusions to .gitignore
    const dotfileExclusions = '\n# Sandbox dotfiles\n.bash*\n.profile\n.gitconfig\n.git-credentials\n.git/\n\n# Dependencies\nnode_modules/\n'
    try {
      const existing = await sandbox.files.read(`${repoPath}/.gitignore`)
      await sandbox.files.write(`${repoPath}/.gitignore`, existing + dotfileExclusions)
    } catch {
      await sandbox.files.write(`${repoPath}/.gitignore`, dotfileExclusions)
    }

    // Overlay AI-generated fragment files (always win over scaffold)
    if (latestVersion?.fragment_data?.files) {
      for (const file of latestVersion.fragment_data.files) {
        const relPath = (file.file_path || '').replace(/^\//, '')
        await sandbox.files.write(`${repoPath}/${relPath}`, file.file_content || file.code || '')
      }
    }

    await sandbox.git.init(repoPath)
    await sandbox.git.configureUser(name, email)
    await sandbox.git.remoteAdd(repoPath, 'origin', repoUrl, { overwrite: true })
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
