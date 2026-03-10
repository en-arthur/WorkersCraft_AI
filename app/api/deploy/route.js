import { NextResponse } from 'next/server'

export async function POST(request) {
  try {
    const { code, filePath, template } = await request.json()

    if (!code || !filePath) {
      return NextResponse.json(
        { error: 'Missing code or file path' },
        { status: 400 }
      )
    }

    // Get Vercel token from environment
    const vercelToken = process.env.VERCEL_TOKEN
    const vercelTeamId = process.env.VERCEL_TEAM_ID

    if (!vercelToken) {
      return NextResponse.json(
        { error: 'Vercel token not configured' },
        { status: 500 }
      )
    }

    // Prepare files for Vercel deploy
    const fileName = filePath.split('/').pop() || 'app.js'
    
    const files = {
      [fileName]: code,
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

    // Create form data for Vercel Deploy API
    const formData = new FormData()
    
    // Add files
    Object.entries(files).forEach(([path, content]) => {
      const blob = new Blob([content], { type: 'application/javascript' })
      formData.append('files', blob, path)
    })

    // Add project settings
    const projectSettings = {
      name: 'workerscraft-app',
      framework: template?.includes('nextjs') ? 'nextjs' : null,
    }
    formData.append('projectSettings', JSON.stringify(projectSettings))

    // Build Vercel API URL
    let deployUrl = 'https://api.vercel.com/v13/deployments'
    if (vercelTeamId) {
      deployUrl += `?teamId=${vercelTeamId}`
    }

    // Deploy to Vercel
    const response = await fetch(deployUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${vercelToken}`,
      },
      body: formData,
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
