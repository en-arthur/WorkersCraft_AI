import { createClient } from '@supabase/supabase-js'
import { Sandbox } from '@e2b/code-interpreter'
import { getGitHubToken, getGitHubUser } from '@/lib/github'

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

    if (!commitMessage) {
      return Response.json(
        { error: 'commitMessage is required' },
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

    // Get project with GitHub info
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('*')
      .eq('id', id)
      .eq('user_id', session.user.id)
      .single()

    if (projectError || !project) {
      return Response.json({ error: 'Project not found' }, { status: 404 })
    }

    if (!project.github_repo_url || !project.github_branch) {
      return Response.json(
        { error: 'Project is not connected to GitHub' },
        { status: 400 }
      )
    }

    // Get GitHub credentials
    const githubToken = getGitHubToken(session)
    const githubUser = getGitHubUser(session)

    console.log('Pushing to GitHub:', { projectId: id, repo: project.github_repo_url })

    // Create sandbox
    sandbox = await Sandbox.create()

    // Clone the repository
    await sandbox.git.dangerouslyAuthenticate({
      username: githubUser.username,
      password: githubToken,
    })

    await sandbox.git.clone(project.github_repo_url, {
      path: '/home/user',
      branch: project.github_branch,
    })

    // Get latest project version
    const { data: latestVersion } = await supabase
      .from('project_versions')
      .select('fragment_data')
      .eq('project_id', id)
      .order('version_number', { ascending: false })
      .limit(1)
      .single()

    if (!latestVersion?.fragment_data?.files) {
      return Response.json(
        { error: 'No files found in project' },
        { status: 400 }
      )
    }

    // Write updated files to sandbox
    for (const file of latestVersion.fragment_data.files) {
      const filePath = file.file_path || file.path
      const content = file.file_content || file.code || file.content || ''
      await sandbox.files.write(filePath, content)
    }

    // Configure git user
    await sandbox.git.configureUser(githubUser.name, githubUser.email)

    // Stage all changes
    await sandbox.git.add('/home/user')

    // Check if there are changes
    const status = await sandbox.git.status('/home/user')
    
    if (status.fileStatus.length === 0) {
      return Response.json(
        { error: 'No changes to commit' },
        { status: 400 }
      )
    }

    // Commit changes
    await sandbox.git.commit('/home/user', commitMessage, {
      authorName: githubUser.name,
      authorEmail: githubUser.email,
    })

    // Push to GitHub
    await sandbox.git.push('/home/user', {
      username: githubUser.username,
      password: githubToken,
      remote: 'origin',
      branch: project.github_branch,
    })

    console.log('Successfully pushed to GitHub')

    // Update project sync time
    const { error: updateError } = await supabase
      .from('projects')
      .update({
        github_last_synced_at: new Date().toISOString(),
      })
      .eq('id', id)

    if (updateError) {
      console.error('Failed to update sync time:', updateError)
    }

    return Response.json({
      success: true,
      message: 'Changes pushed successfully',
      filesChanged: status.fileStatus.length,
    })
  } catch (error) {
    console.error('Push GitHub error:', error)
    return Response.json(
      { error: error.message || 'Failed to push to GitHub' },
      { status: 500 }
    )
  } finally {
    if (sandbox) {
      await sandbox.kill().catch(console.error)
    }
  }
}
