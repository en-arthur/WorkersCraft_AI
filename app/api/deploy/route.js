import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Sandbox } from '@e2b/code-interpreter'
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
  try {
    const { fragment, projectId, userId, sandboxId } = await request.json()

    if (!fragment && !projectId) {
      return NextResponse.json(
        { error: 'Fragment or projectId is required' },
        { status: 400 }
      )
    }

    // Get user's Vercel token from database
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token && !userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const supabase = getSupabaseWithAuth(token)
    const { data: { user } } = await supabase.auth.getUser()
    
    const actualUserId = userId || user?.id
    
    if (!actualUserId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get project if projectId provided
    let projectData = fragment
    let projectName = 'workerscraft-app'
    
    if (projectId) {
      const { data: project } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .eq('user_id', actualUserId)
        .single()
      
      if (!project) {
        return NextResponse.json(
          { error: 'Project not found' },
          { status: 404 }
        )
      }
      
      projectData = project
      projectName = project.name
      
      // Send deployment started notification
      const { sendNotification } = await import('@/lib/bot/notifications')
      await sendNotification(actualUserId, 'deployment_started', {
        projectName: project.name,
        projectId: project.id
      })
    }

    // Extract files — prefer reading directly from sandbox (source of truth)
    let files = {}

    if (sandboxId) {
      try {
        const sbx = await Sandbox.connect(sandboxId)

        // Recursively list all files since E2B list() may not support depth
        async function readDir(dir) {
          const entries = await sbx.files.list(dir)
          for (const entry of entries) {
            const relativePath = entry.path.replace(/^\/home\/user\//, '')
            if (relativePath.startsWith('node_modules/') || relativePath.startsWith('.')) continue
            if (entry.type === 'dir') {
              await readDir(entry.path)
            } else {
              const content = await sbx.files.read(entry.path)
              files[relativePath] = content
            }
          }
        }
        await readDir('/home/user')

        // The sandbox template package.json is a builder script, not an app package.json.
        // Read the actual installed packages from node_modules to build a real one.
        let installedPkg = {}
        try {
          const lockRaw = await sbx.files.read('/home/user/node_modules/.package-lock.json')
          const lock = JSON.parse(lockRaw)
          // top-level packages only (no path separators = direct dep)
          Object.entries(lock.packages || {}).forEach(([k, v]) => {
            const name = k.replace(/^node_modules\//, '')
            if (!name.includes('/node_modules/') && name && !name.startsWith('.')) {
              installedPkg[name] = v.version
            }
          })
        } catch {}

        // Always override with a proper app package.json
        const hasTypeScript = Object.keys(files).some(p => p.endsWith('.ts') || p.endsWith('.tsx'))
        const deps = {}
        const devDeps = {}
        const devNames = ['typescript', '@types/react', '@types/node', '@types/react-dom', 'autoprefixer', 'postcss', 'tailwindcss']
        Object.entries(installedPkg).forEach(([name, version]) => {
          if (devNames.includes(name)) devDeps[name] = version
          else deps[name] = version
        })
        // Ensure next is always present
        if (!deps['next']) deps['next'] = '14.2.5'
        if (!deps['react']) deps['react'] = '^18'
        if (!deps['react-dom']) deps['react-dom'] = '^18'

        files['package.json'] = JSON.stringify({
          name: 'workerscraft-app',
          version: '0.1.0',
          private: true,
          scripts: { dev: 'next dev', build: 'next build', start: 'next start' },
          dependencies: deps,
          ...(Object.keys(devDeps).length > 0 && { devDependencies: devDeps }),
        }, null, 2)

        console.log('Read files from sandbox:', Object.keys(files))
      } catch (err) {
        console.error('Failed to read from sandbox, falling back to fragment:', err)
      }
    }

    // Fallback: extract from fragment schema if sandbox read failed or no sandboxId
    if (Object.keys(files).length === 0) {
      if (fragment?.files && Array.isArray(fragment.files)) {
        fragment.files.forEach(file => {
          const relativePath = (file.file_path || file.name || '').replace(/^\/home\/user\//, '')
          if (relativePath) files[relativePath] = file.code || file.content || file.file_content || ''
        })
      } else if (fragment?.code && fragment?.file_path) {
        files[fragment.file_path.replace(/^\/home\/user\//, '')] = fragment.code
      } else if (projectId) {
        const { data: projectFiles } = await supabase.from('project_files').select('*').eq('project_id', projectId)
        if (projectFiles) projectFiles.forEach(f => { files[f.path] = f.content })
      }
    }

    if (Object.keys(files).length === 0) {
      return NextResponse.json({ error: 'No files found' }, { status: 400 })
    }

    // Get user's Vercel token from database
    const { data: integration, error: integrationError } = await supabase
      .from('user_integrations')
      .select('access_token')
      .eq('user_id', actualUserId)
      .eq('integration_type', 'vercel')
      .single()

    console.log('Integration query:', { user_id: actualUserId, integration, integrationError })

    if (!integration?.access_token) {
      return NextResponse.json(
        { error: 'Vercel token not configured. Please add it in Settings > Integrations.' },
        { status: 400 }
      )
    }

    const vercelToken = decrypt(integration.access_token)

    // Create deployment record
    const { data: deployment } = await supabase
      .from('deployments')
      .insert({
        project_id: projectId,
        user_id: actualUserId,
        type: 'web',
        platform: 'vercel',
        status: 'building',
        branch: 'main'
      })
      .select()
      .single()

    // Only add next.config if missing (sandbox may not have it)
    const template = projectData?.template || fragment?.template
    if ((template?.includes('nextjs') || template === 'nextjs-developer') && !files['next.config.js'] && !files['next.config.mjs']) {
      files['next.config.js'] = `/** @type {import('next').NextConfig} */\nconst nextConfig = { reactStrictMode: true }\nmodule.exports = nextConfig`
    }

    console.log('Deploying files:', Object.keys(files))
    console.log('Template:', template)

    // Prepare files for Vercel deployment (JSON format)
    const vercelFiles = Object.entries(files).map(([path, content]) => ({
      file: path,
      data: content
    }))

    // Build deployment payload according to Vercel API docs
    const deploymentPayload = {
      name: 'workerscraft-app',
      files: vercelFiles,
      projectSettings: {
        framework: template?.includes('nextjs') ? 'nextjs' : null,
        buildCommand: template?.includes('nextjs') ? 'next build' : null,
      }
    }

    console.log('Deployment payload:', {
      fileCount: vercelFiles.length,
      filePaths: vercelFiles.map(f => f.file),
      framework: deploymentPayload.projectSettings.framework
    })

    // Deploy to Vercel
    const response = await fetch('https://api.vercel.com/v13/deployments', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${vercelToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(deploymentPayload),
    })

    const data = await response.json()

    console.log('Vercel response:', { status: response.status, data })

    if (!response.ok) {
      console.error('Vercel deploy error:', data)
      
      // Update deployment record
      if (deployment) {
        await supabase
          .from('deployments')
          .update({
            status: 'failed',
            error_message: data.error?.message || 'Deployment failed',
            completed_at: new Date().toISOString()
          })
          .eq('id', deployment.id)
      }
      
      // Send failure notification
      if (projectId) {
        const { sendNotification } = await import('@/lib/bot/notifications')
        await sendNotification(actualUserId, 'deployment_failed', {
          projectName,
          projectId,
          error: data.error?.message || 'Deployment failed',
          deploymentId: data.id
        })
      }
      
      return NextResponse.json(
        { error: data.error?.message || 'Deployment failed' },
        { status: response.status }
      )
    }

    // Update project with deployment URL (optimistic - will be confirmed by polling)
    if (projectId) {
      await supabase
        .from('projects')
        .update({ deployed_url: `https://${data.url}`, updated_at: new Date().toISOString() })
        .eq('id', projectId)
    }

    // Update deployment record with vercel ID - keep status as 'building' for polling
    if (deployment) {
      await supabase
        .from('deployments')
        .update({
          vercel_deployment_id: data.id,
          deployment_url: `https://${data.url}`,
          status: 'building',
        })
        .eq('id', deployment.id)
    }

    // Return the deployment URL and deployment record ID
    return NextResponse.json({
      url: `https://${data.url}`,
      deploymentId: data.id,
      status: data.readyState || data.status,
      inspectorUrl: data.inspectorUrl,
      dbDeploymentId: deployment?.id,
    })
  } catch (error) {
    console.error('Deploy error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
