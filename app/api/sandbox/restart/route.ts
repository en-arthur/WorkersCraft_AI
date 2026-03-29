import { Sandbox } from 'e2b'

export const maxDuration = 60

export async function POST(req: Request) {
  try {
    const { sandboxId, template } = await req.json()

    if (!sandboxId || !template) {
      return Response.json({ error: 'Missing sandboxId or template' }, { status: 400 })
    }

    // Connect to existing sandbox
    const sbx = await Sandbox.connect(sandboxId)

    // Kill Metro bundler
    await sbx.commands.run('pkill -f "expo" 2>/dev/null; true')
    console.log(`Killed Metro in sandbox ${sandboxId}`)

    // Wait a moment for process to die
    await new Promise(resolve => setTimeout(resolve, 2000))

    // Restart Metro bundler
    sbx.commands.run('cd /home/user && npx expo start --port 8081 --clear', { 
      background: true 
    })
    console.log(`Restarted Metro in sandbox ${sandboxId}`)

    // Wait for Metro to start
    await new Promise(resolve => setTimeout(resolve, 15000))

    const url = `https://${sbx.getHost(8081)}`

    return Response.json({ 
      success: true,
      url,
      sandboxId 
    })
  } catch (error) {
    console.error('Failed to restart sandbox:', error)
    return Response.json({ 
      error: 'Failed to restart sandbox',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
