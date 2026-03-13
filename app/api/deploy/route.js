import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
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
    const { fragment } = await request.json()

    if (!fragment) {
      return NextResponse.json(
        { error: 'Fragment is required' },
        { status: 400 }
      )
    }

    // Extract files from fragment
    let files = {}
    
    if (fragment.files && Array.isArray(fragment.files)) {
      // Multi-file format - use all files from sandbox
      fragment.files.forEach(file => {
        const fullPath = file.file_path || file.name
        if (fullPath) {
          // Remove /home/user/ prefix if present
          const relativePath = fullPath.replace(/^\/home\/user\//, '')
          files[relativePath] = file.code || file.content || file.file_content || ''
        }
      })
    } else if (fragment.code && fragment.file_path) {
      // Single file format
      const relativePath = fragment.file_path.replace(/^\/home\/user\//, '')
      files[relativePath] = fragment.code
    } else {
      return NextResponse.json(
        { error: 'No files found in fragment' },
        { status: 400 }
      )
    }

    // Get user's Vercel token from database
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const supabase = getSupabaseWithAuth(token)
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { data: integration, error: integrationError } = await supabase
      .from('user_integrations')
      .select('access_token')
      .eq('user_id', user.id)
      .eq('integration_type', 'vercel')
      .single()

    console.log('Integration query:', { user_id: user.id, integration, integrationError })

    if (!integration?.access_token) {
      return NextResponse.json(
        { error: 'Vercel token not configured. Please add it in Settings > Integrations.' },
        { status: 400 }
      )
    }

    const vercelToken = decrypt(integration.access_token)

    const template = fragment.template

    // Add required config files for Next.js if not present
    if (template?.includes('nextjs') || template === 'nextjs-developer') {
      if (!files['package.json']) {
        files['package.json'] = JSON.stringify({
          name: 'workerscraft-app',
          version: '0.1.0',
          private: true,
          scripts: {
            dev: 'next dev',
            build: 'next build',
            start: 'next start',
          },
          dependencies: {
            next: '14.2.5',
            react: '^18',
            'react-dom': '^18',
          },
        }, null, 2)
      }
      
      if (!files['next.config.js'] && !files['next.config.mjs']) {
        files['next.config.js'] = `/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
}

module.exports = nextConfig`
      }
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
      return NextResponse.json(
        { error: data.error?.message || 'Deployment failed' },
        { status: response.status }
      )
    }

    // Return the deployment URL
    return NextResponse.json({
      url: `https://${data.url}`,
      deploymentId: data.id,
      status: data.status,
      inspectorUrl: data.inspectorUrl,
    })
  } catch (error) {
    console.error('Deploy error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
