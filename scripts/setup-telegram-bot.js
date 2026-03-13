#!/usr/bin/env node

/**
 * Telegram Bot Setup Script
 * 
 * This script sets up the Telegram webhook for WorkersCraft AI bot.
 * 
 * Usage:
 *   node scripts/setup-telegram-bot.js
 * 
 * Requirements:
 *   - TELEGRAM_BOT_TOKEN in .env.local
 *   - TELEGRAM_WEBHOOK_SECRET in .env.local
 *   - NEXT_PUBLIC_SITE_URL in .env.local
 */

require('dotenv').config({ path: '.env.local' })

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN
const TELEGRAM_WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL

if (!TELEGRAM_BOT_TOKEN) {
  console.error('❌ TELEGRAM_BOT_TOKEN not found in .env.local')
  process.exit(1)
}

if (!TELEGRAM_WEBHOOK_SECRET) {
  console.error('❌ TELEGRAM_WEBHOOK_SECRET not found in .env.local')
  process.exit(1)
}

if (!SITE_URL) {
  console.error('❌ NEXT_PUBLIC_SITE_URL not found in .env.local')
  process.exit(1)
}

const WEBHOOK_URL = `${SITE_URL}/api/integrations/telegram/webhook`

async function setupWebhook() {
  console.log('🤖 Setting up Telegram bot webhook...\n')
  
  try {
    // Get bot info
    console.log('📡 Fetching bot info...')
    const botInfoRes = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getMe`)
    const botInfo = await botInfoRes.json()
    
    if (!botInfo.ok) {
      console.error('❌ Failed to get bot info:', botInfo.description)
      process.exit(1)
    }
    
    console.log(`✅ Bot: @${botInfo.result.username} (${botInfo.result.first_name})`)
    console.log(`   ID: ${botInfo.result.id}\n`)
    
    // Delete existing webhook
    console.log('🗑️  Deleting existing webhook...')
    await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/deleteWebhook`)
    console.log('✅ Deleted\n')
    
    // Set new webhook
    console.log('🔗 Setting webhook...')
    console.log(`   URL: ${WEBHOOK_URL}`)
    
    const setWebhookRes = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setWebhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: WEBHOOK_URL,
        secret_token: TELEGRAM_WEBHOOK_SECRET,
        allowed_updates: ['message', 'callback_query'],
        drop_pending_updates: true,
      })
    })
    
    const setWebhookData = await setWebhookRes.json()
    
    if (!setWebhookData.ok) {
      console.error('❌ Failed to set webhook:', setWebhookData.description)
      process.exit(1)
    }
    
    console.log('✅ Webhook set successfully\n')
    
    // Get webhook info
    console.log('📊 Webhook info:')
    const webhookInfoRes = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getWebhookInfo`)
    const webhookInfo = await webhookInfoRes.json()
    
    if (webhookInfo.ok) {
      console.log(`   URL: ${webhookInfo.result.url}`)
      console.log(`   Pending updates: ${webhookInfo.result.pending_update_count}`)
      console.log(`   Max connections: ${webhookInfo.result.max_connections}`)
      if (webhookInfo.result.last_error_message) {
        console.log(`   ⚠️  Last error: ${webhookInfo.result.last_error_message}`)
      }
    }
    
    console.log('\n✅ Telegram bot setup complete!')
    console.log('\n📝 Next steps:')
    console.log('   1. Open Telegram and search for @' + botInfo.result.username)
    console.log('   2. Go to https://workerscraft.ai/dashboard/integrations')
    console.log('   3. Click "Connect Telegram" and follow the instructions')
    
  } catch (error) {
    console.error('❌ Error:', error.message)
    process.exit(1)
  }
}

setupWebhook()
