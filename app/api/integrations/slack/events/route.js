import crypto from 'crypto'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { BUTTON_ACTIONS, getProjectButtons, getCreateProjectButtons } from '@/lib/bot/buttons'
import { formatSlackBlocks, formatProjectListMessage, formatProjectStatusMessage } from '@/lib/bot/slack-formatter'

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
  const time = Math.floor(Date.now() / 1000)
  if (Math.abs(time - parseInt(timestamp)) > 300) return false
  const sigBasestring = `v0:${timestamp}:${body}`
  const mySignature = 'v0=' + crypto.createHmac('sha256', signingSecret).update(sigBasestring).digest('hex')
  return crypto.timingSafeEqual(Buffer.from(mySignature), Buffer.from(signature))
}

async function sendSlackMessage(channel, accessToken, message) {
  const blocks = formatSlackBlocks(message)
  await fetch('https://slack.com/api/chat.postMessage', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ channel, blocks, text: message.text || 'WorkersCraft' })
  })
}

async function updateSlackMessage(channel, messageTs, accessToken, message) {
  const blocks = formatSlackBlocks(message)
  await fetch('https://slack.com/api/chat.update', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ channel, ts: messageTs, blocks, text: message.text || 'WorkersCraft' })
  })
}

export async function POST(request) {
  try {
    const contentType = request.headers.get('content-type') || ''
    const body = await request.text()
    const signature = request.headers.get('X-Slack-Signature')
    const timestamp = request.headers.get('X-Slack-Request-Timestamp')

    if (contentType.includes('application/x-www-form-urlencoded')) {
      const params = Object.fromEntries(new URLSearchParams(body))

      if (!verifySlackSignature(signature, timestamp, body)) {
        return Response.json({ error: 'Invalid signature' }, { status: 401 })
      }

      if (params.payload) {
        const payload = JSON.parse(params.payload)
        if (payload.type === 'block_actions') return handleInteraction(payload)
        return Response.json({ ok: true })
      }

      if (params.command) return handleSlashCommand(params)

      return Response.json({ ok: true })
    }

    const payload = JSON.parse(body)

    if (payload.type === 'url_verification') {
      return Response.json({ challenge: payload.challenge })
    }

    if (!verifySlackSignature(signature, timestamp, body)) {
      return Response.json({ error: 'Invalid signature' }, { status: 401 })
    }

    return Response.json({ ok: true })

  } catch (error) {
    console.error('Slack events error:', error)
    return Response.json({ ok: true })
  }
}

async function findIntegration(user_id, team_id) {
  const supabase = getSupabaseAdmin()

  // Fast path: exact match
  let { data } = await supabase
    .from('user_integrations')
    .select('*')
    .eq('integration_type', 'slack')
    .eq('platform_user_id', user_id)
    .eq('platform_team_id', team_id)
    .eq('status', 'active')
    .single()

  if (data) return data

  // Legacy path: rows with NULL platform columns (pre-migration)
  const { data: rows } = await supabase
    .from('user_integrations')
    .select('*')
    .eq('integration_type', 'slack')
    .eq('status', 'active')
    .is('platform_user_id', null)

  const legacy = rows?.[0] ?? null

  // Backfill so next request hits the fast path
  if (legacy) {
    await supabase
      .from('user_integrations')
      .update({ platform_user_id: user_id, platform_team_id: team_id })
      .eq('id', legacy.id)
  }

  return legacy
}

async function runCommand(command, args, userId, integrationId) {
  const supabase = getSupabaseAdmin()

  switch (command) {
    case '/list': {
      const { data: projects } = await supabase
        .from('projects')
        .select('*')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false })

      if (!projects || projects.length === 0) {
        return {
          text: '📁 You have no projects yet.\n\nCreate your first project:',
          buttons: [{ type: 'action', text: '➕ Create New Project', action: BUTTON_ACTIONS.CREATE_PROJECT, data: {} }]
        }
      }
      return { blocks: formatProjectListMessage(projects) }
    }

    case '/new': {
      return {
        text: '🎨 Choose Platform\n\nWhat type of app do you want to build?',
        buttons: getCreateProjectButtons('platform')
      }
    }

    case '/status': {
      const projectName = args[0]
      if (!projectName) return { text: '❌ Usage: /workerscraft status <project-name>' }
      const { data: project } = await supabase
        .from('projects').select('*').eq('user_id', userId).ilike('name', `%${projectName}%`).single()
      if (!project) return { text: `❌ Project "${projectName}" not found.` }
      return formatProjectStatusMessage(project)
    }

    case '/deploy': {
      const projectName = args[0]
      if (!projectName) return { text: '❌ Usage: /workerscraft deploy <project-name>' }
      const { data: project } = await supabase
        .from('projects').select('*').eq('user_id', userId).ilike('name', `%${projectName}%`).single()
      if (!project) return { text: `❌ Project "${projectName}" not found.` }
      return {
        text: `⚠️ Deploy: ${project.name}`,
        buttons: [
          { type: 'action', text: '✅ Confirm Deploy', action: BUTTON_ACTIONS.CONFIRM_DEPLOY, data: { projectId: project.id }, style: 'primary' },
          { type: 'action', text: '❌ Cancel', action: BUTTON_ACTIONS.CANCEL, data: {} }
        ]
      }
    }

    case '/help':
    default: {
      return {
        text: `📚 *WorkersCraft Commands*\n\n/workerscraft list — your projects\n/workerscraft new — create a project\n/workerscraft status <name> — project status\n/workerscraft deploy <name> — deploy\n/workerscraft help — this message`
      }
    }
  }
}

async function handleSlashCommand(payload) {
  const { text, user_id, team_id } = payload

  const integration = await findIntegration(user_id, team_id)

  if (!integration) {
    return Response.json({
      response_type: 'ephemeral',
      text: `❌ Account not linked. Connect at: ${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/integrations`
    })
  }

  const [commandName, ...args] = (text || '').trim().split(/\s+/)
  const fullCommand = commandName ? `/${commandName}` : '/list'

  try {
    const data = await runCommand(fullCommand, args, integration.user_id, integration.id)
    const blocks = formatSlackBlocks(data)

    if (!blocks || blocks.length === 0) {
      return Response.json({ response_type: 'in_channel', text: data.text || '✅ Done' })
    }

    return Response.json({ response_type: 'in_channel', text: data.text || 'WorkersCraft', blocks })
  } catch (err) {
    console.error('Slash command error:', err)
    return Response.json({ response_type: 'ephemeral', text: '❌ Something went wrong. Please try again.' })
  }
}

async function handleInteraction(payload) {
  const { user, team, actions, message, channel } = payload

  const integration = await findIntegration(user.id, team.id)

  if (!integration) {
    return Response.json({ response_type: 'ephemeral', text: '❌ Account not linked' })
  }

  const action = actions[0]
  const [actionName, dataStr] = action.action_id.split(':')
  const data = JSON.parse(dataStr || '{}')

  const response = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/bot/action`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: actionName, data, userId: integration.user_id, integrationId: integration.id, platform: 'slack' })
  })

  const responseData = await response.json().catch(() => ({ text: '❌ Action failed.' }))
  const accessToken = decrypt(integration.access_token)

  if (responseData.update_message && message) {
    await updateSlackMessage(channel.id, message.ts, accessToken, responseData)
  } else {
    await sendSlackMessage(channel.id, accessToken, responseData)
  }

  return Response.json({ ok: true })
}
