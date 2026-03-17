import { createClient } from '@supabase/supabase-js'
import { Sandbox } from '@e2b/code-interpreter'
import crypto from 'crypto'

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'default-key-change-in-production-32b'

function encrypt(text) {
  const iv = crypto.randomBytes(16)
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY.slice(0, 32)), iv)
  let encrypted = cipher.update(text)
  encrypted = Buffer.concat([encrypted, cipher.final()])
  return iv.toString('hex') + ':' + encrypted.toString('hex')
}

function randomPassword(len = 24) {
  return crypto.randomBytes(len).toString('base64').slice(0, len)
}

export async function POST(request, { params }) {
  let sandbox = null
  try {
    const { id } = params
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      { global: { headers: { Authorization: `Bearer ${token}` } } }
    )
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    // Verify project ownership
    const { data: project } = await supabase.from('projects').select('id').eq('id', id).eq('user_id', user.id).single()
    if (!project) return Response.json({ error: 'Project not found' }, { status: 404 })

    const keystorePassword = randomPassword()
    const keyPassword = randomPassword()
    const keyAlias = 'app'

    sandbox = await Sandbox.create()

    await sandbox.commands.run(
      `keytool -genkey -v -keystore /home/user/release.jks -alias ${keyAlias} -keyalg RSA -keysize 2048 -validity 10000 ` +
      `-storepass "${keystorePassword}" -keypass "${keyPassword}" ` +
      `-dname "CN=WorkersCraft,OU=App,O=WorkersCraft,L=Unknown,S=Unknown,C=US"`,
      { timeoutMs: 30000 }
    )

    const jksBytes = await sandbox.files.readBytes('/home/user/release.jks')
    const keystoreBase64 = Buffer.from(jksBytes).toString('base64')

    // Store encrypted in user_integrations
    await supabase.from('user_integrations').upsert({
      user_id: user.id,
      integration_type: 'android_signing',
      metadata: { project_id: id },
      access_token: encrypt(JSON.stringify({
        keystoreBase64,
        keystorePassword,
        keyAlias,
        keyPassword,
      })),
    }, { onConflict: 'user_id,integration_type' })

    // Return jks as downloadable base64
    return Response.json({ keystoreBase64, keystorePassword, keyAlias, keyPassword })
  } catch (error) {
    console.error('[generate-keystore]', error)
    return Response.json({ error: error.message }, { status: 500 })
  } finally {
    if (sandbox) await sandbox.kill().catch(console.error)
  }
}
