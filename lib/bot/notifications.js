import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function sendTelegramMessage(chatId, message) {
  const url = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`
  
  await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      ...message
    })
  })
}

async function updateTelegramMessage(chatId, messageId, message) {
  const url = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/editMessageText`
  
  await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      message_id: messageId,
      ...message
    })
  })
}

async function sendSlackMessage(userId, message) {
  // Get user's Slack integration
  const { data: integration } = await supabase
    .from('user_integrations')
    .select('*')
    .eq('user_id', userId)
    .eq('integration_type', 'slack')
    .single()
  
  if (!integration) return
  
  // Decrypt access token
  const crypto = require('crypto')
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
  
  const accessToken = decrypt(integration.access_token)
  
  // Send via Slack Web API
  const slackFormatter = await import('@/lib/bot/slack-formatter')
  const blocks = slackFormatter.formatSlackBlocks(message)
  
  await fetch('https://slack.com/api/chat.postMessage', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      channel: integration.platform_user_id,
      blocks
    })
  })
}

export async function sendNotification(userId, type, data) {
  try {
    // Get user's active integrations
    const { data: integrations } = await supabase
      .from('user_integrations')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active')
      .in('integration_type', ['telegram', 'slack'])
    
    if (!integrations || integrations.length === 0) return
    
    // Check notification preferences
    const { data: preferences } = await supabase
      .from('notification_preferences')
      .select('*')
      .eq('user_id', userId)
      .eq('notification_type', type)
      .eq('enabled', true)
    
    // Format message based on type
    let message
    switch (type) {
      case 'deployment_started':
        message = formatDeploymentStarted(data)
        break
      case 'deployment_progress':
        message = formatDeploymentProgress(data)
        break
      case 'deployment_success':
        message = formatDeploymentSuccess(data)
        break
      case 'deployment_failed':
        message = formatDeploymentFailed(data)
        break
      default:
        return
    }
    
    // Send to each integration
    for (const integration of integrations) {
      if (integration.integration_type === 'telegram') {
        const chatId = integration.metadata?.chat_id
        if (chatId) {
          if (data.messageId && type === 'deployment_progress') {
            // Update existing message
            const telegramFormatter = await import('@/lib/bot/telegram-formatter')
            await updateTelegramMessage(chatId, data.messageId, telegramFormatter.formatTelegramMessage(message))
          } else {
            // Send new message
            const telegramFormatter = await import('@/lib/bot/telegram-formatter')
            await sendTelegramMessage(chatId, telegramFormatter.formatTelegramMessage(message))
          }
        }
      } else if (integration.integration_type === 'slack') {
        await sendSlackMessage(userId, message)
      }
    }
    
  } catch (error) {
    console.error('Notification error:', error)
  }
}

function formatDeploymentStarted(data) {
  return {
    text: `🚀 Deploying ${data.projectName}...\n\n⏳ Initializing deployment...`,
    buttons: []
  }
}

function formatDeploymentProgress(data) {
  const progress = Math.floor(data.progress)
  const bar = '█'.repeat(Math.floor(progress / 10)) + '░'.repeat(10 - Math.floor(progress / 10))
  
  return {
    text: `🚀 Deploying ${data.projectName}...\n\n${data.status}\n${bar} ${progress}%`,
    buttons: []
  }
}

function formatDeploymentSuccess(data) {
  return {
    text: `✅ Deployment Successful!\n\nProject: ${data.projectName}\n🌐 ${data.url}\n⏱️ Build time: ${data.buildTime}s`,
    buttons: [
      { type: 'url', text: '👁️ Open Site', url: data.url },
      { type: 'action', text: '📊 View Logs', action: 'view_logs', data: { deploymentId: data.deploymentId } },
      { type: 'action', text: '📤 Share', action: 'share', data: { projectId: data.projectId } }
    ]
  }
}

function formatDeploymentFailed(data) {
  return {
    text: `❌ Deployment Failed\n\nProject: ${data.projectName}\nError: ${data.error}`,
    buttons: [
      { type: 'action', text: '📝 View Error Log', action: 'view_logs', data: { deploymentId: data.deploymentId } },
      { type: 'action', text: '🔄 Retry Deploy', action: 'deploy', data: { projectId: data.projectId }, style: 'primary' },
      { type: 'url', text: '🌐 Edit in Web', url: `${process.env.NEXT_PUBLIC_SITE_URL}/chat/${data.projectId}` }
    ]
  }
}
