import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'
import { getWelcomeMessage } from '@/lib/bot/telegram-formatter'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'default-key-change-in-production-32b'

function encrypt(text) {
  const iv = crypto.randomBytes(16)
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY.slice(0, 32)), iv)
  let encrypted = cipher.update(text)
  encrypted = Buffer.concat([encrypted, cipher.final()])
  return iv.toString('hex') + ':' + encrypted.toString('hex')
}

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

export async function POST(request) {
  try {
    const update = await request.json()
    
    // Verify webhook secret
    const token = request.headers.get('X-Telegram-Bot-Api-Secret-Token')
    if (token !== process.env.TELEGRAM_WEBHOOK_SECRET) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Handle /start command with verification code
    if (update.message?.text?.startsWith('/start ')) {
      const code = update.message.text.split(' ')[1]
      const chatId = update.message.chat.id
      const username = update.message.from.username
      const firstName = update.message.from.first_name
      
      const supabase = getSupabaseAdmin()
      
      // Verify code
      const { data: verification } = await supabase
        .from('pending_verifications')
        .select('*')
        .eq('verification_code', code)
        .eq('status', 'pending')
        .gt('expires_at', new Date().toISOString())
        .single()
      
      if (!verification) {
        await sendTelegramMessage(chatId, {
          text: '❌ Invalid or expired code. Please generate a new one from the web dashboard.',
          parse_mode: 'Markdown'
        })
        return Response.json({ ok: true })
      }
      
      // Create integration
      await supabase.from('user_integrations').insert({
        user_id: verification.user_id,
        integration_type: 'telegram',
        platform_user_id: chatId.toString(),
        platform_username: username,
        access_token: encrypt(process.env.TELEGRAM_BOT_TOKEN),
        metadata: {
          chat_id: chatId,
          username,
          first_name: firstName,
          linked_at: new Date().toISOString(),
        },
        status: 'active',
      })
      
      // Create default notification preferences
      const { data: integration } = await supabase
        .from('user_integrations')
        .select('id')
        .eq('user_id', verification.user_id)
        .eq('integration_type', 'telegram')
        .eq('platform_user_id', chatId.toString())
        .single()
      
      if (integration) {
        const notificationTypes = [
          'deployment_started',
          'deployment_success',
          'deployment_failed',
        ]
        
        await supabase.from('notification_preferences').insert(
          notificationTypes.map(type => ({
            user_id: verification.user_id,
            integration_id: integration.id,
            notification_type: type,
            enabled: true
          }))
        )
      }
      
      // Mark verification as completed
      await supabase
        .from('pending_verifications')
        .update({ status: 'completed' })
        .eq('id', verification.id)
      
      // Send welcome message
      await sendTelegramMessage(chatId, getWelcomeMessage())
      
      return Response.json({ ok: true })
    }
    
    // Handle plain text messages (conversation state machine)
    if (update.message?.text && !update.message.text.startsWith('/')) {
      const chatId = update.message.chat.id
      const text = update.message.text.trim()
      const supabase = getSupabaseAdmin()

      const { data: integration } = await supabase
        .from('user_integrations')
        .select('*')
        .eq('integration_type', 'telegram')
        .eq('platform_user_id', chatId.toString())
        .single()

      if (!integration) {
        await sendTelegramMessage(chatId, {
          text: '❌ Account not linked. Please visit the dashboard to connect.\n\n🌐 https://workerscraft.com/dashboard/integrations',
          parse_mode: 'Markdown'
        })
        return Response.json({ ok: true })
      }

      // Check for active session
      const { data: session } = await supabase
        .from('bot_sessions')
        .select('*')
        .eq('user_id', integration.user_id)
        .eq('integration_id', integration.id)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (!session) {
        // No active session — show help
        await sendTelegramMessage(chatId, {
          text: '💡 Use /new to create a project or /list to see your projects.',
          parse_mode: 'Markdown'
        })
        return Response.json({ ok: true })
      }

      if (session.state === 'awaiting_name') {
        // Save name, move to platform selection
        await supabase.from('bot_sessions')
          .update({
            state: 'awaiting_platform',
            context: { name: text },
            updated_at: new Date().toISOString(),
          })
          .eq('id', session.id)

        const { formatTelegramMessage } = await import('@/lib/bot/telegram-formatter')
        const { getCreateProjectButtons } = await import('@/lib/bot/buttons')
        await sendTelegramMessage(chatId, formatTelegramMessage({
          text: `✅ Name: *${text}*\n\n🎨 Choose Platform:`,
          buttons: getCreateProjectButtons('platform'),
        }))
        return Response.json({ ok: true })
      }

      if (session.state === 'awaiting_prompt') {
        const ctx = session.context || {}
        const stack = ctx.platform === 'mobile' ? 'expo-developer' : 'nextjs-developer'

        // Create project
        const { data: project, error: projectError } = await supabase
          .from('projects')
          .insert({
            user_id: integration.user_id,
            name: ctx.name || 'My App',
            platform: ctx.platform || 'web',
            tech_stack: stack,
            backend_enabled: ctx.backend || false,
            user_prompt: text,
            description: text.slice(0, 100),
          })
          .select()
          .single()

        // Clean up session
        await supabase.from('bot_sessions').delete().eq('id', session.id)

        if (projectError || !project) {
          await sendTelegramMessage(chatId, { text: '❌ Failed to create project. Please try again.' })
          return Response.json({ ok: true })
        }

        const { formatTelegramMessage } = await import('@/lib/bot/telegram-formatter')
        const { getCreateProjectButtons } = await import('@/lib/bot/buttons')
        await sendTelegramMessage(chatId, formatTelegramMessage({
          text: `✅ *Project Created!*\n\n📝 ${project.name}\nPlatform: ${ctx.platform === 'mobile' ? '📱 Mobile' : '🌐 Web'}\nBackend: ${ctx.backend ? '✅ Enabled' : '❌ Disabled'}\n\nOpen WorkersCraft to start building your app:`,
          buttons: getCreateProjectButtons('complete', { projectId: project.id }),
        }))
        return Response.json({ ok: true })
      }

      return Response.json({ ok: true })
    }

    // Handle regular commands
    if (update.message?.text?.startsWith('/')) {
      const chatId = update.message.chat.id
      const text = update.message.text
      const [command, ...args] = text.split(' ')
      
      const supabase = getSupabaseAdmin()
      
      // Find user integration
      const { data: integration } = await supabase
        .from('user_integrations')
        .select('*')
        .eq('integration_type', 'telegram')
        .eq('platform_user_id', chatId.toString())
        .single()
      
      if (!integration) {
        await sendTelegramMessage(chatId, {
          text: '❌ Account not linked. Please link your account from the web dashboard first.\n\n🌐 https://workerscraft.ai/dashboard/integrations',
          parse_mode: 'Markdown'
        })
        return Response.json({ ok: true })
      }
      
      // Call bot command handler
      const response = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/bot/command`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          command,
          args,
          userId: integration.user_id,
          integrationId: integration.id,
          platform: 'telegram',
        })
      })
      
      const data = await response.json().catch(() => ({ text: '❌ Failed to process command.' }))
      
      // Format and send response
      const telegramFormatter = await import('@/lib/bot/telegram-formatter')
      const message = telegramFormatter.formatTelegramMessage(data)
      
      await sendTelegramMessage(chatId, message)
      
      return Response.json({ ok: true })
    }
    
    // Handle button callbacks
    if (update.callback_query) {
      const chatId = update.callback_query.message.chat.id
      const messageId = update.callback_query.message.message_id
      const callbackData = update.callback_query.data
      
      // Ignore separator clicks
      if (callbackData === 'separator') {
        await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/answerCallbackQuery`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            callback_query_id: update.callback_query.id
          })
        })
        return Response.json({ ok: true })
      }
      
      // Parse callback data - split only on first colon
      const colonIndex = callbackData.indexOf(':')
      const action = colonIndex === -1 ? callbackData : callbackData.slice(0, colonIndex)
      const dataStr = colonIndex === -1 ? '{}' : callbackData.slice(colonIndex + 1)
      const data = JSON.parse(dataStr || '{}')
      
      const supabase = getSupabaseAdmin()
      
      // Find user integration
      const { data: integration } = await supabase
        .from('user_integrations')
        .select('*')
        .eq('integration_type', 'telegram')
        .eq('platform_user_id', chatId.toString())
        .single()
      
      if (!integration) {
        await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/answerCallbackQuery`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            callback_query_id: update.callback_query.id,
            text: '❌ Account not linked',
            show_alert: true
          })
        })
        return Response.json({ ok: true })
      }
      
      // Call bot action handler
      const response = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/bot/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          data,
          userId: integration.user_id,
          integrationId: integration.id,
          platform: 'telegram',
        })
      })
      
      const responseData = await response.json().catch(() => ({ text: '❌ Failed to process action.' }))
      
      // Format response
      const telegramFormatter = await import('@/lib/bot/telegram-formatter')
      const message = telegramFormatter.formatTelegramMessage(responseData)
      
      // Update or send new message
      if (responseData.update_message) {
        await updateTelegramMessage(chatId, messageId, message)
      } else {
        await sendTelegramMessage(chatId, message)
      }
      
      // Answer callback query
      await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/answerCallbackQuery`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          callback_query_id: update.callback_query.id
        })
      })
      
      return Response.json({ ok: true })
    }
    
    return Response.json({ ok: true })
    
  } catch (error) {
    console.error('Telegram webhook error:', error)
    return Response.json({ ok: true }) // Always return ok to Telegram
  }
}
