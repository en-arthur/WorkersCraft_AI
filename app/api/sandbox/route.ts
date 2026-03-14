import { FragmentSchema } from '@/lib/schema'
import { ExecutionResultInterpreter, ExecutionResultWeb } from '@/lib/types'
import { Sandbox } from '@e2b/code-interpreter'

const sandboxTimeout = 10 * 60 * 1000 // 10 minute in ms

export const maxDuration = 60

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
    ...(teamID && accessToken
      ? {
          headers: {
            'X-Supabase-Team': teamID,
            'X-Supabase-Token': accessToken,
          },
        }
      : {}),
  })

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

  // For imported projects (many files), install deps and start dev server
  const isImportedProject = fragment.files && fragment.files.length > 5
  if (isImportedProject && !fragment.template.includes('expo-developer') && fragment.template !== 'code-interpreter-v1') {
    const startCommands: Record<string, string> = {
      'nextjs-developer': 'cd /home/user && npm install && npm run dev',
      'vue-developer': 'cd /home/user && npm install && npm run dev',
      'streamlit-developer': 'cd /home/user && pip install -r requirements.txt -q && streamlit run app.py --server.port 8501',
      'gradio-developer': 'cd /home/user && pip install -r requirements.txt -q && python app.py',
    }
    const cmd = startCommands[fragment.template]
    if (cmd) {
      console.log(`Starting dev server for imported project: ${cmd}`)
      sbx.commands.run(cmd, { background: true })
      // Wait for server to be ready
      await new Promise(resolve => setTimeout(resolve, 20000))
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
