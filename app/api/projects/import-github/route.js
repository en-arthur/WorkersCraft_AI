import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

export async function POST(request) {
  try {
    const { repoUrl, repoName, branch, description } = await request.json()

    if (!repoUrl || !repoName || !branch) {
      return Response.json({ error: 'repoUrl, repoName, and branch are required' }, { status: 400 })
    }

    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      { global: { headers: { Authorization: `Bearer ${token}` } } }
    )
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const githubToken = request.headers.get('x-github-token')
    if (!githubToken) {
      return Response.json({ error: 'No GitHub token. Please sign in with GitHub.' }, { status: 401 })
    }

    // Parse owner/repo from URL
    const match = repoUrl.match(/github\.com[/:]([^/]+)\/([^/.]+)/)
    if (!match) return Response.json({ error: 'Invalid GitHub URL' }, { status: 400 })
    const [, owner, repo] = match

    const ghHeaders = {
      'Authorization': `Bearer ${githubToken}`,
      'Accept': 'application/vnd.github.v3+json',
    }

    // Fetch full file tree via GitHub API (no sandbox needed)
    const treeRes = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`,
      { headers: ghHeaders }
    )
    if (!treeRes.ok) {
      const err = await treeRes.json()
      throw new Error(err.message || 'Failed to fetch repo tree')
    }
    const { tree } = await treeRes.json()

    // Fetch all file contents
    const blobs = tree.filter(f => f.type === 'blob')

    const files = await Promise.all(
      blobs.map(async (f) => {
        const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${f.path}?ref=${branch}`, { headers: ghHeaders })
        if (!res.ok) return null
        const data = await res.json()
        // Store as base64 for binary files, utf-8 for text
        const isText = /\.(js|jsx|ts|tsx|json|md|css|html|env|yml|yaml|toml|txt|sh|py|rb|go|rs|java|c|cpp|h)$/i.test(f.path)
        const content = isText
          ? Buffer.from(data.content, 'base64').toString('utf-8')
          : data.content // keep as base64
        return { file_path: f.path, file_content: content, encoding: isText ? 'utf-8' : 'base64' }
      })
    ).then(r => r.filter(Boolean))

    // Detect template and port
    const paths = files.map(f => f.file_path)
    const reqTxt = files.find(f => f.file_path === 'requirements.txt')?.file_content || ''
    const appPy = files.find(f => f.file_path === 'app.py')?.file_content || ''
    const pkgJson = (() => { try { return JSON.parse(files.find(f => f.file_path === 'package.json')?.file_content || '{}') } catch { return {} } })()
    const appJson = (() => { try { return JSON.parse(files.find(f => f.file_path === 'app.json')?.file_content || '{}') } catch { return {} } })()
    const isExpo = !!(pkgJson.dependencies?.expo || pkgJson.devDependencies?.expo || appJson.expo)

    let template = 'code-interpreter-stateless'
    let port = null
    let platform = 'web'

    if (isExpo) {
      template = 'expo-developer'
      port = 8081
      platform = 'mobile'
    } else if (paths.some(p => p.includes('next.config') || p.startsWith('pages/'))) {
      template = 'nextjs-developer'
      port = 3000
    } else if (paths.some(p => p.includes('nuxt.config') || p.includes('app.vue'))) {
      template = 'vue-developer'
      port = 3000
    } else if (appPy.includes('streamlit') || reqTxt.includes('streamlit')) {
      template = 'streamlit-developer'
      port = 8501
    } else if (appPy.includes('gradio') || reqTxt.includes('gradio')) {
      template = 'gradio-developer'
      port = 7860
    }

    // Save project
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .insert({
        user_id: user.id,
        name: repoName,
        description: description || `Imported from GitHub: ${repoUrl}`,
        platform,
        tech_stack: template,
        github_repo_url: repoUrl,
        github_branch: branch,
      })
      .select()
      .single()

    if (projectError) throw new Error(`Failed to create project: ${projectError.message}`)

    const { error: versionError } = await supabase
      .from('project_versions')
      .insert({
        project_id: project.id,
        version_number: 1,
        fragment_data: { template, port, files, github_repo_url: repoUrl, github_branch: branch },
      })

    if (versionError) throw new Error(`Failed to create version: ${versionError.message}`)

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
    console.error('[import-github] Error:', error)
    return Response.json({ error: error.message || 'Failed to import repository' }, { status: 500 })
  }
}
