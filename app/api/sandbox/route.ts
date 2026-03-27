import { FragmentSchema } from '@/lib/schema'
import { ExecutionResultInterpreter, ExecutionResultWeb } from '@/lib/types'
import { Sandbox as CodeInterpreter } from '@e2b/code-interpreter'
import { Sandbox } from 'e2b'
import { createClient } from '@supabase/supabase-js'

const sandboxTimeout = 30 * 60 * 1000 // 30 minutes in ms

export const maxDuration = 60

async function createSandbox(
  template: string,
  userID: string | undefined,
  teamID: string | undefined,
  accessToken: string | undefined
): Promise<Sandbox | CodeInterpreter> {
  // Use regular Sandbox for templates that support lifecycle
  if (template !== 'code-interpreter-v1') {
    return await Sandbox.create(template, {
      metadata: {
        template,
        userID: userID ?? '',
        teamID: teamID ?? '',
      },
      timeoutMs: sandboxTimeout,
      lifecycle: {
        onTimeout: 'pause',  // Auto-pause instead of kill
        autoResume: true,    // Auto-resume when reconnecting
      },
      ...(teamID && accessToken
        ? {
            headers: {
              'X-Supabase-Team': teamID,
              'X-Supabase-Token': accessToken,
            },
          }
        : {}),
    })
  }
  
  // Use CodeInterpreter for code-interpreter-v1 (doesn't support lifecycle)
  return await CodeInterpreter.create({
    metadata: {
      template,
      userID: userID ?? '',
      teamID: teamID ?? '',
    },
    timeoutMs: sandboxTimeout,
    ...(teamID && accessToken
      ? {
          headers: {
            'X-Supabase-Team': teamID,
            'X-Supabase-Token': accessToken,
          },
        }
      : {}),
  })
}

export async function POST(req: Request) {
  const {
    fragment,
    userID,
    teamID,
    accessToken,
    projectId,
  }: {
    fragment: FragmentSchema
    userID: string | undefined
    teamID: string | undefined
    accessToken: string | undefined
    projectId: string | undefined
  } = await req.json()
  console.log('fragment', fragment)
  console.log('userID', userID)
  console.log('projectId', projectId)

  let sbx: Sandbox | CodeInterpreter

  // Try to reconnect to existing sandbox if projectId is provided
  if (projectId && accessToken) {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { global: { headers: { Authorization: `Bearer ${accessToken}` } } }
    )

    const { data: project } = await supabase
      .from('projects')
      .select('sandbox_id')
      .eq('id', projectId)
      .single()

    if (project?.sandbox_id) {
      try {
        console.log(`Attempting to reconnect to sandbox ${project.sandbox_id}`)
        sbx = await Sandbox.connect(project.sandbox_id, {
          timeoutMs: sandboxTimeout,
        })
        console.log(`Successfully reconnected to sandbox ${project.sandbox_id}`)
      } catch (error) {
        console.log(`Failed to reconnect to sandbox ${project.sandbox_id}, creating new one:`, error)
        sbx = await createSandbox(fragment.template, userID, teamID, accessToken)
        // Update database with new sandbox ID
        await supabase
          .from('projects')
          .update({ sandbox_id: sbx.sandboxId })
          .eq('id', projectId)
        console.log(`Updated project ${projectId} with new sandbox ${sbx.sandboxId}`)
      }
    } else {
      sbx = await createSandbox(fragment.template, userID, teamID, accessToken)
      // Save sandbox ID to database
      await supabase
        .from('projects')
        .update({ sandbox_id: sbx.sandboxId })
        .eq('id', projectId)
      console.log(`Saved sandbox ${sbx.sandboxId} to project ${projectId}`)
    }
  } else {
    sbx = await createSandbox(fragment.template, userID, teamID, accessToken)
  }

  // Install packages
  if (fragment.has_additional_dependencies) {
    await sbx.commands.run(fragment.install_dependencies_command)
    console.log(
      `Installed dependencies: ${fragment.additional_dependencies.join(', ')} in sandbox ${sbx.sandboxId}`,
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
      sbx.commands.run('cd /home/user && npx expo start --web', { background: true })
      await new Promise(resolve => setTimeout(resolve, 15000))
    } catch (error) {
      console.error('Error starting Metro:', error)
    }
  }

  // For imported projects (cloned from GitHub), restart dev server with new files
  const isImportedProject = !!fragment.github_repo_url
  if (isImportedProject && !fragment.template.includes('expo-developer') && fragment.template !== 'code-interpreter-v1') {
    const startCommands: Record<string, string> = {
      'nextjs-developer': 'cd /home/user && npm install --legacy-peer-deps && npm run dev -- --port 3000',
      'vue-developer': 'cd /home/user && npm install --legacy-peer-deps && npm run dev',
      'streamlit-developer': 'cd /home/user && pip install -r requirements.txt -q && streamlit run app.py --server.port 8501 --server.headless true',
      'gradio-developer': 'cd /home/user && pip install -r requirements.txt -q && python app.py',
    }
    const killCommands: Record<string, string> = {
      'nextjs-developer': 'pkill -f "next" 2>/dev/null; true',
      'vue-developer': 'pkill -f "nuxt|vite" 2>/dev/null; true',
      'streamlit-developer': 'pkill -f "streamlit" 2>/dev/null; true',
      'gradio-developer': 'pkill -f "python" 2>/dev/null; true',
    }
    const killCmd = killCommands[fragment.template]
    const startCmd = startCommands[fragment.template]
    if (killCmd && startCmd) {
      console.log(`Restarting dev server for imported project template: ${fragment.template}`)
      await sbx.commands.run(killCmd).catch(() => {})
      sbx.commands.run(startCmd, { background: true })

      // Poll until the port is ready (max 60s)
      const port = fragment.port ?? 3000
      const host = sbx.getHost(port)
      const url = `https://${host}`
      const maxWait = 60000
      const interval = 2000
      const start = Date.now()
      let ready = false
      while (Date.now() - start < maxWait) {
        try {
          const res = await fetch(url, { signal: AbortSignal.timeout(3000) })
          if (res.status < 500) { ready = true; break }
        } catch {}
        await new Promise(r => setTimeout(r, interval))
      }
      console.log(`Dev server ready: ${ready} after ${Date.now() - start}ms`)
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
      url: `https://${sbx?.getHost(fragment.port ?? 80)}`,
    } as ExecutionResultWeb),
  )
}