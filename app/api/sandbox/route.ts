import { FragmentSchema } from '@/lib/schema'
import { ExecutionResultInterpreter, ExecutionResultWeb } from '@/lib/types'
import { Sandbox } from '@e2b/code-interpreter'
import { Sandbox as SdkSandbox } from '@e2b/sdk'

const sandboxTimeout = 10 * 60 * 1000 // 10 minutes

export const maxDuration = 60

export async function POST(req: Request) {
  const {
    fragment,
    userID,
    teamID,
    accessToken,
    githubToken,
  }: {
    fragment: FragmentSchema
    userID: string | undefined
    teamID: string | undefined
    accessToken: string | undefined
    githubToken?: string
  } = await req.json()

  console.log('fragment template:', fragment.template)
  console.log('isImported:', !!fragment.github_repo_url)

  const sandboxOpts = {
    metadata: {
      template: fragment.template,
      userID: userID ?? '',
      teamID: teamID ?? '',
    },
    timeoutMs: sandboxTimeout,
    ...(teamID && accessToken
      ? { headers: { 'X-Supabase-Team': teamID, 'X-Supabase-Token': accessToken } }
      : {}),
  }

  // ── Imported GitHub project: clone directly in sandbox ──────────────────
  if (fragment.github_repo_url && fragment.github_branch && githubToken) {
    console.log(`Cloning ${fragment.github_repo_url}@${fragment.github_branch} in sandbox`)

    const sbx = await SdkSandbox.create({ template: fragment.template, ...sandboxOpts } as any)

    // Kill any existing dev server from the template default files
    const killCmds: Record<string, string> = {
      'nextjs-developer': 'pkill -f next || true',
      'vue-developer':    'pkill -f "nuxt|vite" || true',
      'streamlit-developer': 'pkill -f streamlit || true',
      'gradio-developer': 'pkill -f python || true',
    }
    if (killCmds[fragment.template]) {
      await sbx.commands.run(killCmds[fragment.template])
    }

    // Clone repo into /home/user (overwrites template default files)
    await sbx.commands.run('rm -rf /home/user && mkdir -p /home/user')
    await sbx.git.clone(fragment.github_repo_url, {
      path: '/home/user',
      branch: fragment.github_branch,
      depth: 1,
      username: userID ?? 'git',
      password: githubToken,
    })

    // Start dev server in background
    const startCmds: Record<string, string> = {
      'nextjs-developer':    'cd /home/user && npm install --legacy-peer-deps --silent && npm run dev -- --port 3000',
      'vue-developer':       'cd /home/user && npm install --legacy-peer-deps --silent && npm run dev',
      'streamlit-developer': 'cd /home/user && pip install -r requirements.txt -q && streamlit run app.py --server.port 8501 --server.headless true',
      'gradio-developer':    'cd /home/user && pip install -r requirements.txt -q && python app.py',
    }
    const startCmd = startCmds[fragment.template]
    if (startCmd) {
      sbx.commands.run(startCmd, { background: true })
    }

    // Poll until port responds (max 90s)
    const port = fragment.port ?? 3000
    const url = `https://${sbx.getHost(port)}`
    const deadline = Date.now() + 90_000
    let ready = false
    while (Date.now() < deadline) {
      try {
        const r = await fetch(url, { signal: AbortSignal.timeout(3000) })
        if (r.status < 500) { ready = true; break }
      } catch {}
      await new Promise(r => setTimeout(r, 3000))
    }
    console.log(`Imported project ready: ${ready}, url: ${url}`)

    return new Response(JSON.stringify({
      sbxId: sbx.sandboxId,
      template: fragment.template,
      url,
    } as ExecutionResultWeb))
  }

  // ── Normal AI-generated fragment flow (unchanged) ────────────────────────
  const sbx = await Sandbox.create(fragment.template, sandboxOpts)

  // Install additional packages
  if (fragment.has_additional_dependencies) {
    await sbx.commands.run(fragment.install_dependencies_command)
    console.log(`Installed: ${fragment.additional_dependencies.join(', ')}`)
  }

  // Write files
  if (fragment.files && Array.isArray(fragment.files) && fragment.files.length > 0) {
    for (const file of fragment.files) {
      await sbx.files.write(file.file_path, file.file_content)
    }
  } else if (fragment.code && fragment.file_path) {
    await sbx.files.write(fragment.file_path, fragment.code)
  }

  // Inject Backend SDK
  if (fragment.backend_enabled && fragment.backend_app_id && fragment.backend_status === 'active') {
    const { generateBackendSDK } = await import('@/lib/generate-sdk')
    await sbx.files.write('/home/user/lib/backend.js', generateBackendSDK(fragment.backend_app_id))
  } else if (fragment.backend_enabled && fragment.backend_status === 'pending') {
    const { generatePlaceholderSDK } = await import('@/lib/generate-sdk')
    await sbx.files.write('/home/user/lib/backend.js', generatePlaceholderSDK('pending', 'Backend is being set up.'))
  } else if (fragment.backend_enabled && fragment.backend_status === 'registration_failed') {
    const { generatePlaceholderSDK } = await import('@/lib/generate-sdk')
    await sbx.files.write('/home/user/lib/backend.js', generatePlaceholderSDK('error', 'Backend setup failed.'))
  }

  // Expo Metro bundler
  if (fragment.template.includes('expo-developer')) {
    sbx.commands.run('cd /home/user && npx expo start --web', { background: true })
    await new Promise(r => setTimeout(r, 15000))
  }

  // Code interpreter
  if (fragment.template === 'code-interpreter-v1') {
    const code = fragment.files?.length ? fragment.files[0].file_content : fragment.code || ''
    const { logs, error, results } = await sbx.runCode(code)
    return new Response(JSON.stringify({
      sbxId: sbx.sandboxId,
      template: fragment.template,
      stdout: logs.stdout,
      stderr: logs.stderr,
      runtimeError: error,
      cellResults: results,
    } as ExecutionResultInterpreter))
  }

  return new Response(JSON.stringify({
    sbxId: sbx.sandboxId,
    template: fragment.template,
    url: `https://${sbx.getHost(fragment.port ?? 80)}`,
  } as ExecutionResultWeb))
}
