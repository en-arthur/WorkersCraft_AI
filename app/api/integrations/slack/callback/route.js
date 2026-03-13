import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'
import { getWelcomeMessage } from '@/lib/bot/slack-formatter'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'default-key-change-in-production-32b'

function encrypt(text) {
  const iv = crypto.randomBytes(16)
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY.slice(0, 32)), iv)
  let encrypted = cipher.update(text)
  encrypted = Buffer.concat([encrypted, cipher.final()])
  return iv.toString('hex') + ':' + encrypted.toString('hex')
}

function verifyState(state) {
  global.oauthStates = global.oauthStates || {}
  const stateData = global.oauthStates[state]
  
  if (!stateData || stateData.expires < Date.now()) {
    return null
  }
  
  delete global.oauthStates[state]
  return stateData.userId
}

async function sendSlackMessage(userId, accessToken, message) {
  await fetch('https://slack.com/api/chat.postMessage', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      channel: userId,
      blocks: message.blocks
    })
  })
}

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')
  
  if (error) {
    return Response.redirect(`${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/integrations?error=slack_${error}`)
  }
  
  if (!code || !state) {
    return Response.redirect(`${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/integrations?error=slack_invalid`)
  }
  
  // Verify state
  const userId = verifyState(state)
  if (!userId) {
    return Response.redirect(`${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/integrations?error=slack_state`)
  }
  
  try {
    // Exchange code for token
    const tokenResponse = await fetch('https://slack.com/api/oauth.v2.access', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.SLACK_CLIENT_ID,
        client_secret: process.env.SLACK_CLIENT_SECRET,
        code,
        redirect_uri: process.env.SLACK_REDIRECT_URI,
      })
    })
    
    const data = await tokenResponse.json()
    
    if (!data.ok) {
      console.error('Slack OAuth error:', data)
      return Response.redirect(`${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/integrations?error=slack_oauth`)
    }
    
    // Store integration
    const { data: integration } = await supabase.from('user_integrations').insert({
      user_id: userId,
      integration_type: 'slack',
      platform_user_id: data.authed_user.id,
      platform_team_id: data.team.id,
      platform_team_name: data.team.name,
      access_token: encrypt(data.access_token),
      metadata: {
        bot_user_id: data.bot_user_id,
        scope: data.scope,
        linked_at: new Date().toISOString(),
        app_id: data.app_id,
      },
      status: 'active',
    }).select().single()
    
    // Create default notification preferences
    if (integration) {
      const notificationTypes = [
        'deployment_started',
        'deployment_success',
        'deployment_failed',
      ]
      
      await supabase.from('notification_preferences').insert(
        notificationTypes.map(type => ({
          user_id: userId,
          integration_id: integration.id,
          notification_type: type,
          enabled: true
        }))
      )
    }
    
    // Send welcome message
    await sendSlackMessage(data.authed_user.id, data.authed_user.access_token || data.access_token, getWelcomeMessage())
    
    return Response.redirect(`${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/integrations?success=slack`)
    
  } catch (error) {
    console.error('Slack callback error:', error)
    return Response.redirect(`${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/integrations?error=slack_server`)
  }
}
