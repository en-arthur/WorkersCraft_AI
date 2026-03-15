import crypto from 'crypto'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'default-key-change-in-production-32b'

function decrypt(text) {
  const parts = text.split(':')
  const iv = Buffer.from(parts.shift(), 'hex')
  const encrypted = Buffer.from(parts.join(':'), 'hex')
  const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY.slice(0, 32)), iv)
  let decrypted = decipher.update(encrypted)
  decrypted = Buffer.concat([decrypted, decipher.final()])
  return decrypted.toString()
}

function verifySlackSignature(signature, timestamp, body) {
  const signingSecret = process.env.SLACK_SIGNING_SECRET
  
  // Check timestamp is within 5 minutes
  const time = Math.floor(Date.now() / 1000)
  if (Math.abs(time - parseInt(timestamp)) > 300) {
    return false
  }
  
  // Compute signature
  const sigBasestring = `v0:${timestamp}:${body}`
  const mySignature = 'v0=' + crypto
    .createHmac('sha256', signingSecret)
    .update(sigBasestring)
    .digest('hex')
  
  return crypto.timingSafeEqual(
    Buffer.from(mySignature),
    Buffer.from(signature)
  )
}

async function sendSlackMessage(channel, accessToken, message) {
  const slackFormatter = await import('@/lib/bot/slack-formatter')
  const blocks = slackFormatter.formatSlackBlocks(message)
  
  await fetch('https://slack.com/api/chat.postMessage', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      channel,
      blocks
    })
  })
}

async function updateSlackMessage(channel, messageTs, accessToken, message) {
  const slackFormatter = await import('@/lib/bot/slack-formatter')
  const blocks = slackFormatter.formatSlackBlocks(message)
  
  await fetch('https://slack.com/api/chat.update', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      channel,
      ts: messageTs,
      blocks
    })
  })
}

export async function POST(request) {
  try {
    const body = await request.text()
    const signature = request.headers.get('X-Slack-Signature')
    const timestamp = request.headers.get('X-Slack-Request-Timestamp')
    
    const payload = JSON.parse(body)
    
    // Handle URL verification first — no signature needed
    if (payload.type === 'url_verification') {
      return Response.json({ challenge: payload.challenge })
    }

    // Verify signature for all other requests
    if (!verifySlackSignature(signature, timestamp, body)) {
      return Response.json({ error: 'Invalid signature' }, { status: 401 })
    }
    
    // Handle slash commands
    if (payload.command) {
      return handleSlashCommand(payload)
    }
    
    // Handle interactive components (buttons)
    if (payload.type === 'block_actions') {
      return handleInteraction(payload)
    }
    
    return Response.json({ ok: true })
    
  } catch (error) {
    console.error('Slack events error:', error)
    return Response.json({ ok: true }) // Always return ok to Slack
  }
}

async function handleSlashCommand(payload) {
  const { command, text, user_id, team_id, channel_id } = payload
  
  const supabase = getSupabaseAdmin()
  
  // Find user integration
  const { data: integration } = await supabase
    .from('user_integrations')
    .select('*')
    .eq('integration_type', 'slack')
    .eq('platform_user_id', user_id)
    .eq('platform_team_id', team_id)
    .single()
  
  if (!integration) {
    return Response.json({
      response_type: 'ephemeral',
      text: '❌ Account not linked. Please link your account from the web dashboard.\n\n🌐 ' + process.env.NEXT_PUBLIC_SITE_URL + '/dashboard/integrations'
    })
  }
  
  // Parse command
  const [commandName, ...args] = text.trim().split(' ')
  const fullCommand = commandName ? `/${commandName}` : '/list'
  
  // Call bot command handler
  const response = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/bot/command`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      command: fullCommand,
      args,
      userId: integration.user_id,
      integrationId: integration.id,
      platform: 'slack',
    })
  })
  
  const data = await response.json()
  
  // Format for Slack
  const slackFormatter = await import('@/lib/bot/slack-formatter')
  const blocks = slackFormatter.formatSlackBlocks(data)
  
  return Response.json({
    response_type: 'in_channel',
    blocks
  })
}

async function handleInteraction(payload) {
  const { user, team, actions, message, channel } = payload
  
  const supabase = getSupabaseAdmin()
  
  // Find user integration
  const { data: integration } = await supabase
    .from('user_integrations')
    .select('*')
    .eq('integration_type', 'slack')
    .eq('platform_user_id', user.id)
    .eq('platform_team_id', team.id)
    .single()
  
  if (!integration) {
    return Response.json({
      response_type: 'ephemeral',
      text: '❌ Account not linked'
    })
  }
  
  const action = actions[0]
  const [actionName, dataStr] = action.action_id.split(':')
  const data = JSON.parse(dataStr || '{}')
  
  // Call bot action handler
  const response = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/bot/action`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: actionName,
      data,
      userId: integration.user_id,
      integrationId: integration.id,
      platform: 'slack',
    })
  })
  
  const responseData = await response.json()
  
  // Get access token
  const accessToken = decrypt(integration.access_token)
  
  // Update or send new message
  if (responseData.update_message && message) {
    await updateSlackMessage(channel.id, message.ts, accessToken, responseData)
    return Response.json({ ok: true })
  } else {
    await sendSlackMessage(channel.id, accessToken, responseData)
    return Response.json({ ok: true })
  }
}
