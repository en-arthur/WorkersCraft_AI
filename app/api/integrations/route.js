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

function decrypt(text) {
  const parts = text.split(':')
  const iv = Buffer.from(parts.shift(), 'hex')
  const encrypted = Buffer.from(parts.join(':'), 'hex')
  const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY.slice(0, 32)), iv)
  let decrypted = decipher.update(encrypted)
  decrypted = Buffer.concat([decrypted, decipher.final()])
  return decrypted.toString()
}

// Use anon client only for auth verification
function getSupabaseWithAuth(token) {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  )
}

// Use service role for writes to bypass RLS issues
function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
}

export async function GET(request) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = getSupabaseWithAuth(token)
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = getSupabaseAdmin()
  const { data, error } = await admin
    .from('user_integrations')
    .select('*')
    .eq('user_id', user.id)

  if (error) return Response.json({ error: error.message }, { status: 500 })

  const integrations = data.map(i => ({
    ...i,
    access_token: i.access_token ? '••••••••' : null
  }))

  return Response.json({ integrations })
}

export async function POST(request) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = getSupabaseWithAuth(token)
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { integration_type, access_token } = body

  if (!integration_type || !access_token) {
    return Response.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const encrypted = encrypt(access_token)
  const admin = getSupabaseAdmin()

  // Check if integration already exists
  const { data: existing } = await admin
    .from('user_integrations')
    .select('id')
    .eq('user_id', user.id)
    .eq('integration_type', integration_type)
    .is('platform_user_id', null)
    .maybeSingle()

  let data, error

  if (existing) {
    // Update existing
    ;({ data, error } = await admin
      .from('user_integrations')
      .update({
        access_token: encrypted,
        status: 'connected',
        metadata: { last_used: new Date().toISOString() },
        updated_at: new Date().toISOString()
      })
      .eq('id', existing.id)
      .select()
      .single())
  } else {
    // Insert new
    ;({ data, error } = await admin
      .from('user_integrations')
      .insert({
        user_id: user.id,
        integration_type,
        access_token: encrypted,
        status: 'connected',
        metadata: { last_used: new Date().toISOString() },
      })
      .select()
      .single())
  }

  if (error) {
    console.error('[integrations POST] Supabase error:', error)
    return Response.json({ error: error.message }, { status: 500 })
  }

  return Response.json({ integration: { ...data, access_token: '••••••••' } })
}
