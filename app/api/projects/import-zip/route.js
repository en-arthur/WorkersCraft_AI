import { createClient } from '@supabase/supabase-js'
import JSZip from 'jszip'

export const dynamic = 'force-dynamic'

const SKIP = (path) =>
  path.startsWith('node_modules/') ||
  path.startsWith('.git/') ||
  path.startsWith('.next/') ||
  path.split('/').some(p => p.startsWith('.'))

export async function POST(request) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      { global: { headers: { Authorization: `Bearer ${token}` } } }
    )
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const formData = await request.formData()
    const file = formData.get('file')
    if (!file) return Response.json({ error: 'No file provided' }, { status: 400 })

    const projectName = formData.get('name') || file.name.replace(/\.zip$/i, '') || 'Imported Project'

    const arrayBuffer = await file.arrayBuffer()
    const zip = await JSZip.loadAsync(arrayBuffer)

    const files = []
    const TEXT_EXT = /\.(js|jsx|ts|tsx|json|md|css|html|env|yml|yaml|toml|txt|sh|py|rb|go|rs|java|c|cpp|h|svg|xml|prisma|graphql|lock)$/i

    for (const [relativePath, zipEntry] of Object.entries(zip.files)) {
      if (zipEntry.dir) continue
      // Strip leading folder if zip was created with a root folder
      const normalizedPath = relativePath.replace(/^[^/]+\//, '')
      if (!normalizedPath || SKIP(normalizedPath)) continue

      const isText = TEXT_EXT.test(normalizedPath)
      const content = isText
        ? await zipEntry.async('string')
        : await zipEntry.async('base64')

      files.push({
        file_name: normalizedPath.split('/').pop(),
        file_path: normalizedPath,
        file_content: content,
        encoding: isText ? 'utf-8' : 'base64',
      })
    }

    if (files.length === 0) {
      return Response.json({ error: 'No valid files found in zip' }, { status: 400 })
    }

    // Detect template + platform
    const paths = files.map(f => f.file_path)
    const pkgJson = (() => {
      try { return JSON.parse(files.find(f => f.file_path === 'package.json')?.file_content || '{}') }
      catch { return {} }
    })()
    const appJson = (() => {
      try { return JSON.parse(files.find(f => f.file_path === 'app.json')?.file_content || '{}') }
      catch { return {} }
    })()
    const reqTxt = files.find(f => f.file_path === 'requirements.txt')?.file_content || ''
    const appPy = files.find(f => f.file_path === 'app.py')?.file_content || ''
    const isExpo = !!(pkgJson.dependencies?.expo || pkgJson.devDependencies?.expo || appJson.expo)

    let template = 'nextjs-developer'
    let port = 3000
    let platform = 'web'

    if (isExpo) {
      template = 'expo-developer'; port = 8081; platform = 'mobile'
    } else if (paths.some(p => p.includes('next.config') || p.startsWith('pages/'))) {
      template = 'nextjs-developer'; port = 3000
    } else if (appPy.includes('streamlit') || reqTxt.includes('streamlit')) {
      template = 'streamlit-developer'; port = 8501
    } else if (appPy.includes('gradio') || reqTxt.includes('gradio')) {
      template = 'gradio-developer'; port = 7860
    }

    // Create project
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .insert({
        user_id: user.id,
        name: projectName,
        description: `Imported from ZIP`,
        platform,
        tech_stack: template,
      })
      .select()
      .single()

    if (projectError) throw new Error(`Failed to create project: ${projectError.message}`)

    // Save version with files — mark as imported so sandbox knows to start dev server
    const { error: versionError } = await supabase
      .from('project_versions')
      .insert({
        project_id: project.id,
        version_number: 1,
        fragment_data: { template, port, files, imported: true },
      })

    if (versionError) throw new Error(`Failed to save version: ${versionError.message}`)

    return Response.json({ project })
  } catch (error) {
    console.error('[import-zip] Error:', error)
    return Response.json({ error: error.message || 'Failed to import ZIP' }, { status: 500 })
  }
}
