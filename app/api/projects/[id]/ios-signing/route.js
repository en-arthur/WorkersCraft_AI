import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'default-key-change-in-production-32b'

function encrypt(text) {
  const iv = crypto.randomBytes(16)
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY.slice(0, 32)), iv)
  let encrypted = cipher.update(text)
  encrypted = Buffer.concat([encrypted, cipher.final()])
  return iv.toString('hex') + ':' + encrypted.toString('hex')
}

export async function POST(request, { params }) {
  try {
    const { id } = params
    const formData = await request.formData()
    const p12File = formData.get('p12')
    const p12Password = formData.get('p12Password') || ''
    const provisionFile = formData.get('provision')
    const scheme = formData.get('scheme') || ''

    if (!p12File || !provisionFile) {
      return Response.json({ error: 'p12 and provision files are required' }, { status: 400 })
    }

    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      { global: { headers: { Authorization: `Bearer ${token}` } } }
    )
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: project } = await supabase.from('projects').select('id').eq('id', id).eq('user_id', session.user.id).single()
    if (!project) return Response.json({ error: 'Project not found' }, { status: 404 })

    const p12Base64 = Buffer.from(await p12File.arrayBuffer()).toString('base64')
    const provisionBase64 = Buffer.from(await provisionFile.arrayBuffer()).toString('base64')

    await supabase.from('user_integrations').upsert({
      user_id: session.user.id,
      integration_type: 'ios_signing',
      metadata: { project_id: id },
      access_token: encrypt(JSON.stringify({ p12Base64, p12Password, provisionBase64, scheme })),
    }, { onConflict: 'user_id,integration_type' })

    return Response.json({ success: true })
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }
}
