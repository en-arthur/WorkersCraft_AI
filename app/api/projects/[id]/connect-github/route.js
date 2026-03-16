import { createClient } from '@supabase/supabase-js'
import { Sandbox } from '@e2b/code-interpreter'
import { getGitHubUser } from '@/lib/github'

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

    const githubUser = {
      username: user.user_metadata?.user_name || user.user_metadata?.preferred_username || 'user',
      name: user.user_metadata?.full_name || user.user_metadata?.name || 'User',
      email: user.email,
    }

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
    }

    await sandbox.commands.run('git init /home/user')
    await sandbox.git.configureUser(githubUser.name, githubUser.email)
    await sandbox.git.remoteAdd('/home/user', 'origin', repoUrl, { overwrite: true })
    await sandbox.git.dangerouslyAuthenticate({ username: githubUser.username, password: githubToken })
    await sandbox.git.add('/home/user')
    await sandbox.git.commit('/home/user', 'Initial commit from WorkersCraft', {
      authorName: githubUser.name,
      authorEmail: githubUser.email,
      allowEmpty: true,
    })
    await sandbox.git.push('/home/user', {
      username: githubUser.username,
      password: githubToken,
      remote: 'origin',
      branch,
      setUpstream: true,
    })

    await supabase.from('projects').update({
      github_repo_url: repoUrl,
      github_branch: branch,
      github_last_synced_at: new Date().toISOString(),
    }).eq('id', id)

    return Response.json({ success: true, github_repo_url: repoUrl, github_branch: branch })
  } catch (error) {
    console.error('Connect GitHub error:', error)
    return Response.json({ error: error.message || 'Failed to connect repository' }, { status: 500 })
  } finally {
    if (sandbox) await sandbox.kill().catch(console.error)
  }
}

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
      return Response.json(
        { error: 'repoUrl and branch are required' },
        { status: 400 }
      )
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

    // Verify project ownership
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('*')
      .eq('id', id)
      .eq('user_id', session.user.id)
      .single()

    if (projectError || !project) {
      return Response.json({ error: 'Project not found' }, { status: 404 })
    }

    // Get GitHub credentials
    const githubToken = getGitHubToken(session)
    const githubUser = getGitHubUser(session)

    console.log('Connecting project to GitHub:', { projectId: id, repoUrl, branch })

    // Create sandbox with existing project files
    sandbox = await Sandbox.create()

    // Get latest project version
    const { data: latestVersion } = await supabase
      .from('project_versions')
      .select('fragment_data')
      .eq('project_id', id)
      .order('version_number', { ascending: false })
      .limit(1)
      .single()

    // Write project files to sandbox
    if (latestVersion?.fragment_data?.files) {
      for (const file of latestVersion.fragment_data.files) {
        await sandbox.files.write(file.file_path, file.file_content || file.code || '')
      }
    }

    // Initialize git repository
    await sandbox.commands.run('git init /home/user')

    // Configure git user
    await sandbox.git.configureUser(githubUser.name, githubUser.email)

    // Add remote
    await sandbox.git.remoteAdd('/home/user', 'origin', repoUrl, { overwrite: true })

    // Authenticate
    await sandbox.git.dangerouslyAuthenticate({
      username: githubUser.username,
      password: githubToken,
    })

    // Stage all files
    await sandbox.git.add('/home/user')

    // Create initial commit
    await sandbox.git.commit('/home/user', 'Initial commit from WorkersCraft', {
      authorName: githubUser.name,
      authorEmail: githubUser.email,
      allowEmpty: true,
    })

    // Set upstream and push
    await sandbox.git.push('/home/user', {
      username: githubUser.username,
      password: githubToken,
      remote: 'origin',
      branch,
      setUpstream: true,
    })

    console.log('Successfully pushed to GitHub')

    // Get commit SHA
    const statusResult = await sandbox.git.status('/home/user')
    const commitSha = statusResult.currentBranch

    // Update project with GitHub info
    const { error: updateError } = await supabase
      .from('projects')
      .update({
        github_repo_url: repoUrl,
        github_branch: branch,
        github_last_synced_at: new Date().toISOString(),
        github_last_commit_sha: commitSha,
      })
      .eq('id', id)

    if (updateError) {
      throw new Error(`Failed to update project: ${updateError.message}`)
    }

    return Response.json({
      success: true,
      github_repo_url: repoUrl,
      github_branch: branch,
    })
  } catch (error) {
    console.error('Connect GitHub error:', error)
    return Response.json(
      { error: error.message || 'Failed to connect repository' },
      { status: 500 }
    )
  } finally {
    if (sandbox) {
      await sandbox.kill().catch(console.error)
    }
  }
}
