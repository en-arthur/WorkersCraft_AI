import { createClient } from '@supabase/supabase-js'
import { Sandbox } from '@e2b/code-interpreter'
import { getGitHubToken, getGitHubUser, parseGitHubUrl, fetchRepoDetails } from '@/lib/github'
import crypto from 'crypto'

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'default-key-change-in-production-32b'

function decrypt(text) {
  const parts = text.split(':')
  const iv = Buffer.from(parts.shift(), 'hex')
  const encrypted = Buffer.from(parts.join(':'), 'hex')
  const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY.slice(0, 32)), iv)
  let decrypted = decipher.update(encrypted)
  decrypted = Buffer.concat([decrypted, decipher.final()])
  return decrypted.toString()
}

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
    const { fragment, commitMessage } = await request.json()

    if (!fragment) {
      return Response.json({ error: 'Fragment is required' }, { status: 400 })
    }

    if (!fragment.github_repo_url || !fragment.github_branch) {
      return Response.json(
        { error: 'Project is not connected to GitHub' },
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

    // Get GitHub credentials
    const githubToken = getGitHubToken(session)
    const githubUser = getGitHubUser(session)

    // Get Vercel token
    const { data: integration } = await supabase
      .from('user_integrations')
      .select('access_token')
      .eq('user_id', session.user.id)
      .eq('integration_type', 'vercel')
      .single()

    if (!integration?.access_token) {
      return Response.json(
        { error: 'Vercel token not configured. Please add it in Settings > Integrations.' },
        { status: 400 }
      )
    }

    const vercelToken = decrypt(integration.access_token)

    console.log('Deploying from GitHub:', { repo: fragment.github_repo_url, branch: fragment.github_branch })

    // Create sandbox
    sandbox = await Sandbox.create()

    // Clone and push changes if commitMessage provided
    if (commitMessage) {
      await sandbox.git.dangerouslyAuthenticate({
        username: githubUser.username,
        password: githubToken,
      })

      await sandbox.git.clone(fragment.github_repo_url, {
        path: '/home/user',
        branch: fragment.github_branch,
      })

      // Write files
      if (fragment.files && Array.isArray(fragment.files)) {
        for (const file of fragment.files) {
          const filePath = file.file_path || file.path
          const content = file.file_content || file.code || file.content || ''
          await sandbox.files.write(filePath, content)
        }
      }

      await sandbox.git.configureUser(githubUser.name, githubUser.email)
      await sandbox.git.add('/home/user')
      
      const status = await sandbox.git.status('/home/user')
      if (status.fileStatus.length > 0) {
        await sandbox.git.commit('/home/user', commitMessage, {
          authorName: githubUser.name,
          authorEmail: githubUser.email,
        })

        await sandbox.git.push('/home/user', {
          username: githubUser.username,
          password: githubToken,
          remote: 'origin',
          branch: fragment.github_branch,
        })

        console.log('Pushed changes to GitHub')
      }
    }

    // Get repo details for Vercel deployment
    const { owner, repo } = parseGitHubUrl(fragment.github_repo_url)
    const repoDetails = await fetchRepoDetails(githubToken, owner, repo)

    // Deploy to Vercel using gitSource
    const deploymentPayload = {
      name: repo,
      gitSource: {
        type: 'github',
        repoId: repoDetails.id.toString(),
        ref: fragment.github_branch,
      },
      projectSettings: {
        framework: fragment.template?.includes('nextjs') ? 'nextjs' : null,
        buildCommand: fragment.template?.includes('nextjs') ? 'next build' : null,
        outputDirectory: fragment.template?.includes('nextjs') ? '.next' : null,
      }
    }

    console.log('Deploying to Vercel from GitHub:', deploymentPayload)

    const response = await fetch('https://api.vercel.com/v13/deployments', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${vercelToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(deploymentPayload),
    })

    const data = await response.json()

    if (!response.ok) {
      console.error('Vercel deploy error:', data)
      return Response.json(
        { error: data.error?.message || 'Deployment failed' },
        { status: response.status }
      )
    }

    return Response.json({
      url: `https://${data.url}`,
      deploymentId: data.id,
      status: data.status,
      inspectorUrl: data.inspectorUrl,
    })
  } catch (error) {
    console.error('Deploy from GitHub error:', error)
    return Response.json(
      { error: error.message || 'Failed to deploy from GitHub' },
      { status: 500 }
    )
  } finally {
    if (sandbox) {
      await sandbox.kill().catch(console.error)
    }
  }
}
