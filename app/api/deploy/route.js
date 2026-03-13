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
    const { code, filePath, files: fragmentFiles, template } = await request.json()

    // Handle both single file (code/filePath) and multi-file (files array) formats
    let files = {}
    
    if (fragmentFiles && Array.isArray(fragmentFiles)) {
      // Multi-file format
      fragmentFiles.forEach(file => {
        const fileName = file.file_path?.split('/').pop() || file.name || 'app.js'
        files[fileName] = file.code || file.content || ''
      })
    } else if (code && filePath) {
      // Single file format
      const fileName = filePath.split('/').pop() || 'app.js'
      files[fileName] = code
    } else {
      return NextResponse.json(
        { error: 'Missing code or file path' },
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

    // Determine if it's a static HTML file or needs wrapping
    const isHtmlFile = Object.keys(files).some(f => f.endsWith('.html'))
    
    if (!isHtmlFile && !template?.includes('nextjs')) {
      // Wrap JS/other files in an HTML page for static deployment
      const mainFile = Object.keys(files)[0]
      const mainContent = files[mainFile]
      
      files['index.html'] = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>WorkersCraft App</title>
</head>
<body>
  <div id="root"></div>
  <script>${mainContent}</script>
</body>
</html>`
      delete files[mainFile]
    }

    // Add package.json based on template
    if (template?.includes('nextjs') || template === 'nextjs-developer') {
      files['package.json'] = JSON.stringify({
        name: 'workerscraft-app',
        version: '0.1.0',
        private: true,
        scripts: {
          dev: 'next dev',
          build: 'next build',
          start: 'next start',
          lint: 'next lint',
        },
        dependencies: {
          next: '14.2.5',
          react: '^18',
          'react-dom': '^18',
        },
        devDependencies: {
          typescript: '^5',
          '@types/node': '^20',
          '@types/react': '^18',
          '@types/react-dom': '^18',
          postcss: '^8',
          tailwindcss: '^3.4.1',
          eslint: '^8',
          'eslint-config-next': '14.2.5',
        },
      }, null, 2)
    } else if (template?.includes('streamlit')) {
      files['requirements.txt'] = 'streamlit\npandas\nnumpy\nmatplotlib\nrequests\nseaborn\nplotly\n'
    } else if (template?.includes('gradio')) {
      files['requirements.txt'] = 'gradio\npandas\nnumpy\nmatplotlib\nrequests\nseaborn\nplotly\n'
    }

    // Prepare files for Vercel deployment (JSON format)
    const vercelFiles = Object.entries(files).map(([path, content]) => ({
      file: path,
      data: content
    }))

    // Build deployment payload
    const deploymentPayload = {
      name: 'workerscraft-app',
      files: vercelFiles,
      projectSettings: {
        framework: template?.includes('nextjs') ? 'nextjs' : null,
      }
    }

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

    if (!response.ok) {
      console.error('Vercel deploy error:', data)
      return NextResponse.json(
        { error: data.error?.message || 'Deployment failed' },
        { status: response.status }
      )
    }

    // Return the deployment URL
    return NextResponse.json({
      url: data.url,
      deploymentId: data.id,
    })
  } catch (error) {
    console.error('Deploy error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
