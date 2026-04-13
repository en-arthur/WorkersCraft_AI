import { Sandbox } from 'e2b'

export const maxDuration = 10

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const sbxId = searchParams.get('sbxId')
  const port = parseInt(searchParams.get('port') || '3000')

  if (!sbxId) return Response.json({ ready: false }, { status: 400 })

  try {
    const sbx = await Sandbox.connect(sbxId)
    const host = sbx.getHost(port)
    const url = `https://${host}`

    const res = await fetch(url, { signal: AbortSignal.timeout(4000) })
    // E2B's closed port page returns 502/503, a running app returns 200/304/etc
    const ready = res.status < 500

    return Response.json({ ready })
  } catch {
    return Response.json({ ready: false })
  }
}
