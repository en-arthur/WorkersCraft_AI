import crypto from 'crypto'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'default-key-change-in-production-32b'

function encrypt(text) {
  const iv = crypto.randomBytes(16)
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY.slice(0, 32)), iv)
  let encrypted = cipher.update(text)
  encrypted = Buffer.concat([encrypted, cipher.final()])
  return iv.toString('hex') + ':' + encrypted.toString('hex')
}

function generateSecureState(userId) {
  const state = crypto.randomBytes(32).toString('hex')
  global.oauthStates = global.oauthStates || {}
  global.oauthStates[state] = { userId, expires: Date.now() + 600000 }
  return state
}

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const userId = searchParams.get('user_id')
  
  if (!userId) {
    return Response.json({ error: 'User ID required' }, { status: 400 })
  }
  
  const state = generateSecureState(userId)
  
  const slackAuthUrl = new URL('https://slack.com/oauth/v2/authorize')
  slackAuthUrl.searchParams.set('client_id', process.env.SLACK_CLIENT_ID)
  slackAuthUrl.searchParams.set('scope', 'chat:write,commands,users:read')
  slackAuthUrl.searchParams.set('user_scope', 'chat:write')
  slackAuthUrl.searchParams.set('redirect_uri', process.env.SLACK_REDIRECT_URI)
  slackAuthUrl.searchParams.set('state', state)
  
  return Response.redirect(slackAuthUrl.toString())
}
