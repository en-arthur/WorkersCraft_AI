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

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const supabaseToken = searchParams.get('state')

  if (!code) {
    return new Response('<script>window.close()</script>', { headers: { 'Content-Type': 'text/html' } })
  }

  try {
    // Exchange code for GitHub token
    const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code,
        redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/github/callback`,
      }),
    })

    const tokenData = await tokenRes.json()
    const githubToken = tokenData.access_token

    if (!githubToken) {
      return new Response('<script>window.opener?.postMessage({type:"github_auth_error",error:"Failed to get token"},"*");window.close()</script>', {
        headers: { 'Content-Type': 'text/html' }
      })
    }

    // Get user from supabase token
    const { data: { user } } = await supabase.auth.getUser(supabaseToken)

    if (user) {
      // Save GitHub token to user_integrations
      await supabase.from('user_integrations').upsert({
        user_id: user.id,
        integration_type: 'github',
        access_token: encrypt(githubToken),
        status: 'connected',
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id,integration_type' })
    }

    // Close popup and notify parent
    return new Response(
      `<script>window.opener?.postMessage({type:"github_auth_success",token:"${githubToken}"},"*");window.close()</script>`,
      { headers: { 'Content-Type': 'text/html' } }
    )
  } catch (error) {
    return new Response(
      `<script>window.opener?.postMessage({type:"github_auth_error",error:"${error.message}"},"*");window.close()</script>`,
      { headers: { 'Content-Type': 'text/html' } }
    )
  }
}
