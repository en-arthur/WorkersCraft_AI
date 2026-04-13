import { FragmentSchema } from '@/lib/schema'
import { ExecutionResultInterpreter, ExecutionResultWeb } from '@/lib/types'
import { Sandbox } from '@e2b/code-interpreter'

const sandboxTimeout = 30 * 60 * 1000 // 30 minutes in ms

export const maxDuration = 120

export async function POST(req: Request) {
  const {
    fragment,
    userID,
    teamID,
    accessToken,
  }: {
    fragment: FragmentSchema
    userID: string | undefined
    teamID: string | undefined
    accessToken: string | undefined
  } = await req.json()
  console.log('fragment', fragment)
  console.log('userID', userID)

  // Create an interpreter or a sandbox
  const sbx = await Sandbox.create(fragment.template, {
    metadata: {
      template: fragment.template,
      userID: userID ?? '',
      teamID: teamID ?? '',
    },
    timeoutMs: sandboxTimeout,
    // Fix Metro bundler Host header for Expo mobile preview
    ...(fragment.template.includes('expo-developer') && {
      network: {
        maskRequestHost: 'localhost:8081'
      }
    }),
    ...(teamID && accessToken
      ? {
          headers: {
            'X-Supabase-Team': teamID,
            'X-Supabase-Token': accessToken,
          },
        }
      : {}),
  })

  // Buffer to capture stderr from all commands
  let stderrBuffer = ''

  // Install packages
  if (fragment.has_additional_dependencies) {
    await sbx.commands.run(fragment.install_dependencies_command, {
      onStderr: (data) => {
        stderrBuffer += data + '\n'
      }
    })
    console.log(
      `Installed dependencies: ${fragment.additional_dependencies.join(', ')} in sandbox ${sbx.sandboxId}`,
    )
  }

  // Clean up default Expo boilerplate before writing AI-generated files
  if (fragment.template.includes('expo-developer')) {
    await sbx.commands.run(
      'cd /home/user && rm -f "app/(tabs)/explore.tsx" "app/(tabs)/+not-found.tsx"',
      { onStderr: () => {} }
    )
  }

  // Copy files to sandbox filesystem
  // Handle multi-file format
  if (fragment.files && Array.isArray(fragment.files) && fragment.files.length > 0) {
    // Write all files from the files array
    for (const file of fragment.files) {
      await sbx.files.write(file.file_path, file.file_content)
      console.log(`Copied file ${file.file_name} to ${file.file_path} in ${sbx.sandboxId}`)
    }
  } else if (fragment.code && fragment.file_path) {
    // Fallback to single file format
    await sbx.files.write(fragment.file_path, fragment.code)
    console.log(`Copied file to ${fragment.file_path} in ${sbx.sandboxId}`)
  }

  // Inject Backend SDK if project has backend enabled
  if (fragment.backend_enabled && fragment.backend_app_id && fragment.backend_status === 'active') {
    console.log(`Injecting backend SDK for app ${fragment.backend_app_id}`)
    const { generateBackendSDK } = await import('@/lib/generate-sdk')
    const sdkCode = generateBackendSDK(fragment.backend_app_id)
    await sbx.files.write('/home/user/lib/backend.js', sdkCode)
    console.log('Backend SDK injected successfully')
  } else if (fragment.backend_enabled && fragment.backend_status === 'pending') {
    console.log('Backend registration pending, injecting placeholder SDK')
    const { generatePlaceholderSDK } = await import('@/lib/generate-sdk')
    const placeholderSDK = generatePlaceholderSDK('pending', 'Backend is being set up. Please refresh in a moment.')
    await sbx.files.write('/home/user/lib/backend.js', placeholderSDK)
  } else if (fragment.backend_enabled && fragment.backend_status === 'registration_failed') {
    console.log('Backend registration failed, injecting error SDK')
    const { generatePlaceholderSDK } = await import('@/lib/generate-sdk')
    const errorSDK = generatePlaceholderSDK('error', 'Backend setup failed. Please retry from project settings.')
    await sbx.files.write('/home/user/lib/backend.js', errorSDK)
  }

  // Start Metro bundler for Expo after writing files
  if (fragment.template.includes('expo-developer')) {
    console.log('Starting Expo Metro bundler...')
    try {
      sbx.commands.run('cd /home/user && npx expo start --port 8081', { 
        background: true,
        onStderr: (data) => {
          stderrBuffer += data + '\n'
        }
      })
      await new Promise(resolve => setTimeout(resolve, 15000))
    } catch (error) {
      console.error('Error starting Metro:', error)
    }
  }

  // Start dev server only for imported projects (GitHub or ZIP imports).
  // AI-generated projects use E2B templates that already have the dev server running.
  const isImportedProject = !!(fragment as any).imported
  if (isImportedProject && !fragment.template.includes('expo-developer') && fragment.template !== 'code-interpreter-v1') {
    // Use npm ci if lockfile exists (faster), otherwise npm install
    const killCommands: Record<string, string> = {
      'nextjs-developer': 'pkill -f "next" 2>/dev/null; true',
      'vue-developer': 'pkill -f "nuxt|vite" 2>/dev/null; true',
      'streamlit-developer': 'pkill -f "streamlit" 2>/dev/null; true',
      'gradio-developer': 'pkill -f "python" 2>/dev/null; true',
    }
    const killCmd = killCommands[fragment.template]
    if (killCmd) {
      console.log(`Starting dev server for imported project: ${fragment.template}`)
      await sbx.commands.run(killCmd).catch(() => {})

      // For Node.js projects: install deps synchronously first, then start server in background
      const isNode = ['nextjs-developer', 'vue-developer'].includes(fragment.template)
      const isPython = ['streamlit-developer', 'gradio-developer'].includes(fragment.template)

      if (isNode) {
        const hasLockfile = fragment.files?.some((f: any) =>
          f.file_path === 'package-lock.json' || f.file_path === 'yarn.lock'
        )
        const installCmd = hasLockfile ? 'npm ci --silent' : 'npm install --legacy-peer-deps --silent'
        console.log(`Running ${installCmd}...`)
        const installResult = await sbx.commands.run(`cd /home/user && ${installCmd}`, {
          timeoutMs: 90000,
          onStderr: (data) => { stderrBuffer += data + '\n' }
        }).catch((err) => { console.error('npm install failed:', err) })
        console.log(`npm install done, exit code: ${(installResult as any)?.exitCode}`)

        const devCmd = fragment.template === 'nextjs-developer'
          ? 'cd /home/user && npm run dev -- --port 3000'
          : 'cd /home/user && npm run dev'
        sbx.commands.run(devCmd, {
          background: true,
          onStderr: (data) => { stderrBuffer += data + '\n' }
        })
      } else if (isPython) {
        const pyCmd = fragment.template === 'streamlit-developer'
          ? 'cd /home/user && pip install -r requirements.txt -q && streamlit run app.py --server.port 8501 --server.headless true'
          : 'cd /home/user && pip install -r requirements.txt -q && python app.py'
        sbx.commands.run(pyCmd, {
          background: true,
          onStderr: (data) => { stderrBuffer += data + '\n' }
        })
      }

      // Poll until the port is ready (max 90s)
      const port = fragment.port ?? 3000
      const host = sbx.getHost(port)
      const pollUrl = `https://${host}`
      const maxWait = 90000
      const interval = 3000
      const pollStart = Date.now()
      let ready = false
      while (Date.now() - pollStart < maxWait) {
        try {
          const res = await fetch(pollUrl, { signal: AbortSignal.timeout(4000) })
          if (res.status < 500) { ready = true; break }
        } catch {}
        await new Promise(r => setTimeout(r, interval))
      }
      console.log(`Dev server ready: ${ready} after ${Date.now() - pollStart}ms, stderr: ${stderrBuffer.slice(0, 200)}`)
    }
  }

  // Execute code or return a URL to the running sandbox
  if (fragment.template === 'code-interpreter-v1') {
    const code = fragment.files && fragment.files.length > 0
      ? fragment.files[0].file_content
      : fragment.code || ''

    const { logs, error, results } = await sbx.runCode(code)

    return new Response(
      JSON.stringify({
        sbxId: sbx?.sandboxId,
        template: fragment.template,
        stdout: logs.stdout,
        stderr: logs.stderr,
        runtimeError: error,
        cellResults: results,
      } as ExecutionResultInterpreter),
    )
  }

  return new Response(
    JSON.stringify({
      sbxId: sbx?.sandboxId,
      template: fragment.template,
      url: `https://${sbx?.getHost(fragment.port ?? 3000)}`,
      stderr: stderrBuffer.trim() || undefined,
    } as ExecutionResultWeb),
  )
}