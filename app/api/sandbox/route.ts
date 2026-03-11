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

  // Start Metro bundler for Expo after writing files
  if (fragment.template.includes('expo-developer')) {
    console.log('Starting Expo Metro bundler...')
    try {
      // Start Metro in background
      sbx.commands.run('cd /home/user && npx expo start --web', { background: true })
      console.log('Metro start command executed')
      
      // Wait for Metro to compile and start
      await new Promise(resolve => setTimeout(resolve, 15000))
      console.log('Metro bundler should be ready')
    } catch (error) {
      console.error('Error starting Metro:', error)
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
      url: `https://${sbx?.getHost(fragment.port || 80)}`,
    } as ExecutionResultWeb),
  )
}
