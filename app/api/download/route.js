import { Sandbox } from '@e2b/code-interpreter'
import JSZip from 'jszip'

export async function POST(req) {
  const { sandboxId } = await req.json()
  if (!sandboxId) return new Response('Missing sandboxId', { status: 400 })

  const sbx = await Sandbox.connect(sandboxId)
  const zip = new JSZip()

  async function readDir(dir) {
    const entries = await sbx.files.list(dir)
    for (const entry of entries) {
      const rel = entry.path.replace(/^\/home\/user\//, '')
      if (rel.startsWith('node_modules/') || rel.startsWith('.')) continue
      if (entry.type === 'dir') {
        await readDir(entry.path)
      } else {
        const content = await sbx.files.read(entry.path)
        zip.file(rel, content)
      }
    }
  }

  await readDir('/home/user')

  const buffer = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' })

  return new Response(buffer, {
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': 'attachment; filename="project.zip"',
    },
  })
}
