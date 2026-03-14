import { createClient } from '@supabase/supabase-js'
import { Sandbox } from '@e2b/code-interpreter'
import { parseGitHubUrl } from '@/lib/github'

function getSupabaseWithAuth(token) {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  )
}

export async function POST(request) {
  let sandbox = null
  
  try {
    const { repoUrl, repoName, branch, description } = await request.json()

    if (!repoUrl || !repoName || !branch) {
      return Response.json(
        { error: 'repoUrl, repoName, and branch are required' },
        { status: 400 }
      )
    }

    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      { global: { headers: { Authorization: `Bearer ${token}` } } }
    )
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      console.error('[import-github] Invalid JWT:', userError?.message)
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const githubToken = request.headers.get('x-github-token')
    if (!githubToken) {
      console.error('[import-github] Missing X-GitHub-Token for user:', user.id)
      return Response.json({ error: 'No GitHub token. Please sign in with GitHub.' }, { status: 401 })
    }

    const githubUser = {
      username: user.user_metadata.user_name,
      name: user.user_metadata.full_name || user.user_metadata.name,
      email: user.email,
    }

    console.log('Importing GitHub repo:', { repoUrl, branch, user: githubUser.username })

    // Create sandbox
    sandbox = await Sandbox.create()

    // Authenticate with GitHub
    await sandbox.git.dangerouslyAuthenticate({
      username: githubUser.username,
      password: githubToken,
    })

    // Configure git user
    await sandbox.git.configureUser(githubUser.name, githubUser.email)

    // Clone repository
    await sandbox.git.clone(repoUrl, {
      path: '/home/user',
      branch,
    })

    console.log('Repository cloned successfully')

    // Read all files from the cloned repo
    const files = []
    const readDir = async (path) => {
      const entries = await sandbox.files.list(path)
      
      for (const entry of entries) {
        const fullPath = `${path}/${entry.name}`
        
        if (entry.type === 'dir') {
          // Skip .git directory and node_modules
          if (entry.name !== '.git' && entry.name !== 'node_modules') {
            await readDir(fullPath)
          }
        } else if (entry.type === 'file') {
          try {
            const content = await sandbox.files.read(fullPath)
            files.push({
              file_path: fullPath,
              file_content: content,
            })
          } catch (err) {
            console.error(`Failed to read file ${fullPath}:`, err)
          }
        }
      }
    }

    await readDir('/home/user')

    console.log(`Read ${files.length} files from repository`)

    // Detect template/framework
    const hasPackageJson = files.some(f => f.file_path.includes('package.json'))
    const hasNextConfig = files.some(f => f.file_path.includes('next.config'))
    const hasPagesDir = files.some(f => f.file_path.includes('/pages/'))
    const hasAppDir = files.some(f => f.file_path.includes('/app/'))
    
    let template = 'code-interpreter-stateless'
    if (hasNextConfig || hasPagesDir || hasAppDir) {
      template = 'nextjs-developer'
    } else if (hasPackageJson) {
      template = 'code-interpreter-stateless'
    }

    // Create project in database
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .insert({
        user_id: user.id,
        name: repoName,
        description: description || `Imported from GitHub: ${repoUrl}`,
        platform: 'web',
        tech_stack: template,
        github_repo_url: repoUrl,
        github_branch: branch,
      })
      .select()
      .single()

    if (projectError) {
      throw new Error(`Failed to create project: ${projectError.message}`)
    }

    // Create initial version with files
    const { error: versionError } = await supabase
      .from('project_versions')
      .insert({
        project_id: project.id,
        version_number: 1,
        fragment_data: {
          template,
          files,
          github_repo_url: repoUrl,
          github_branch: branch,
        },
      })

    if (versionError) {
      throw new Error(`Failed to create version: ${versionError.message}`)
    }

    console.log('Project created successfully:', project.id)

    return Response.json({
      project: {
        id: project.id,
        name: project.name,
        description: project.description,
        github_repo_url: repoUrl,
        github_branch: branch,
      },
    })
  } catch (error) {
    console.error('Import GitHub error:', error)
    return Response.json(
      { error: error.message || 'Failed to import repository' },
      { status: 500 }
    )
  } finally {
    if (sandbox) {
      await sandbox.kill().catch(console.error)
    }
  }
}
