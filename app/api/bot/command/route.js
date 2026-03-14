import { createClient } from '@supabase/supabase-js'
import { BUTTON_ACTIONS, getCreateProjectButtons } from '@/lib/bot/buttons'
import { formatProjectListMessage, formatProjectStatusMessage } from '@/lib/bot/slack-formatter'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

export async function POST(request) {
  const { command, userId, integrationId, platform, args = [] } = await request.json()
  
  const supabase = getSupabaseAdmin()
  
  // Verify integration
  const { data: integration } = await supabase
    .from('user_integrations')
    .select('*')
    .eq('id', integrationId)
    .eq('user_id', userId)
    .single()
  
  if (!integration) {
    return Response.json({ error: 'Integration not found' }, { status: 404 })
  }
  
  const startTime = Date.now()
  
  try {
    let response
    
    switch (command) {
      case '/list':
        response = await handleListCommand(userId, platform)
        break
        
      case '/new':
        response = await handleNewCommand(userId, integrationId, platform)
        break
        
      case '/deploy':
        response = await handleDeployCommand(userId, platform, args)
        break
        
      case '/status':
        response = await handleStatusCommand(userId, platform, args)
        break
        
      case '/help':
        response = await handleHelpCommand()
        break
        
      case '/settings':
        response = await handleSettingsCommand(userId, integrationId, platform)
        break
        
      case '/schedule':
        response = await handleScheduleCommand(userId, args)
        break
        
      default:
        response = {
          text: `❌ Unknown command: ${command}\n\nType /help to see available commands.`
        }
    }
    
    // Log interaction
    await supabase.from('bot_interactions').insert({
      user_id: userId,
      integration_id: integrationId,
      interaction_type: 'command',
      command,
      success: true,
      response_time_ms: Date.now() - startTime,
    })
    
    return Response.json(response)
    
  } catch (error) {
    console.error('Command error:', error)
    
    // Log error
    await supabase.from('bot_interactions').insert({
      user_id: userId,
      integration_id: integrationId,
      interaction_type: 'command',
      command,
      success: false,
      error_message: error.message,
      response_time_ms: Date.now() - startTime,
    })
    
    return Response.json({
      text: '❌ An error occurred. Please try again.',
    }, { status: 500 })
  }
}

async function handleListCommand(userId, platform) {
  const { data: projects } = await supabase
    .from('projects')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
  
  if (!projects || projects.length === 0) {
    return {
      text: '📁 You have no projects yet.\n\nCreate your first project:',
      buttons: [
        { type: 'action', text: '➕ Create New Project', action: BUTTON_ACTIONS.CREATE_PROJECT, data: {} }
      ]
    }
  }
  
  if (platform === 'slack') {
    return { blocks: formatProjectListMessage(projects) }
  } else {
    const telegramFormatter = await import('@/lib/bot/telegram-formatter')
    return telegramFormatter.formatProjectListMessage(projects)
  }
}

async function handleNewCommand(userId, integrationId, platform) {
  // Create bot session
  await supabase.from('bot_sessions').insert({
    user_id: userId,
    integration_id: integrationId,
    state: 'creating_project',
    context: { step: 'platform' },
  })
  
  return {
    text: '🎨 Choose Platform\n\nWhat type of app do you want to build?',
    buttons: getCreateProjectButtons('platform')
  }
}

async function handleDeployCommand(userId, platform, args) {
  const projectName = args[0]
  
  if (!projectName) {
    return {
      text: '❌ Please specify a project name.\n\nUsage: /deploy <project-name>',
    }
  }
  
  const { data: project } = await supabase
    .from('projects')
    .select('*')
    .eq('user_id', userId)
    .ilike('name', `%${projectName}%`)
    .single()
  
  if (!project) {
    return {
      text: `❌ Project "${projectName}" not found.\n\nUse /list to see your projects.`,
    }
  }
  
  return {
    text: `⚠️ Deploy Confirmation\n\nProject: ${project.name}\nTemplate: ${project.template}\nTarget: Vercel\n\nThis will deploy your latest changes.`,
    buttons: [
      { type: 'action', text: '✅ Confirm Deploy', action: BUTTON_ACTIONS.CONFIRM_DEPLOY, data: { projectId: project.id }, style: 'primary' },
      { type: 'action', text: '❌ Cancel', action: BUTTON_ACTIONS.CANCEL, data: {} }
    ]
  }
}

async function handleStatusCommand(userId, platform, args) {
  const projectName = args[0]
  
  if (!projectName) {
    return {
      text: '❌ Please specify a project name.\n\nUsage: /status <project-name>',
    }
  }
  
  const { data: project } = await supabase
    .from('projects')
    .select('*')
    .eq('user_id', userId)
    .ilike('name', `%${projectName}%`)
    .single()
  
  if (!project) {
    return {
      text: `❌ Project "${projectName}" not found.`,
    }
  }
  
  if (platform === 'slack') {
    return formatProjectStatusMessage(project)
  } else {
    const telegramFormatter = await import('@/lib/bot/telegram-formatter')
    return telegramFormatter.formatProjectStatusMessage(project)
  }
}

async function handleHelpCommand() {
  return {
    text: `📚 *WorkersCraft AI Bot Commands*

*Project Management:*
/list - Show all your projects
/new - Create a new project
/status <project> - Get project status

*Deployment:*
/deploy <project> - Deploy to Vercel
/schedule <project> - Save deployment schedule
/schedule - View all saved schedules

*Utility:*
/help - Show this help message
/settings - Configure preferences

💡 *Tip:* Most actions can be done with buttons - no typing needed!

📝 *Note:* Schedules are saved but require manual execution or external automation.`,
  }
}

async function handleSettingsCommand(userId, integrationId, platform) {
  // Get notification preferences
  const { data: preferences } = await supabase
    .from('notification_preferences')
    .select('*')
    .eq('user_id', userId)
    .eq('integration_id', integrationId)
  
  const prefMap = {}
  preferences?.forEach(pref => {
    prefMap[pref.notification_type] = pref.enabled
  })
  
  return {
    text: `⚙️ *Bot Settings*\n\n*Notifications:*`,
    buttons: [
      {
        type: 'action',
        text: prefMap['deployment_success'] ? '✅ Deployment Success' : '❌ Deployment Success',
        action: 'toggle_notification',
        data: { type: 'deployment_success', integrationId }
      },
      {
        type: 'action',
        text: prefMap['deployment_failed'] ? '✅ Deployment Failed' : '❌ Deployment Failed',
        action: 'toggle_notification',
        data: { type: 'deployment_failed', integrationId }
      },
      {
        type: 'action',
        text: '💾 Save',
        action: 'save_settings',
        data: {},
        style: 'primary'
      }
    ]
  }
}

async function handleScheduleCommand(userId, args) {
  const projectName = args[0]
  
  if (!projectName) {
    // Show all schedules
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_SITE_URL}/api/schedules?userId=${userId}`
    )
    
    const data = await response.json()
    
    if (data.schedules && data.schedules.length > 0) {
      let text = '📋 *Scheduled Deployments*\n\n'
      const buttons = []
      
      data.schedules.forEach((schedule, index) => {
        text += `${index + 1}. ${schedule.label}\n`
        text += `   Next run: ${new Date(schedule.next_run_at).toLocaleString()}\n\n`
        
        buttons.push({
          type: 'action',
          text: `🗑️ Cancel #${index + 1}`,
          action: 'cancel_schedule',
          data: { scheduleId: schedule.id }
        })
      })
      
      return { text, buttons }
    } else {
      return {
        text: '📋 No scheduled deployments\n\nUse /schedule <project> to create one',
      }
    }
  }
  
  // Schedule specific project
  const { data: project } = await supabase
    .from('projects')
    .select('*')
    .eq('user_id', userId)
    .ilike('name', `%${projectName}%`)
    .single()
  
  if (!project) {
    return {
      text: `❌ Project "${projectName}" not found.`,
    }
  }
  
  return {
    text: `⏰ Schedule Deployment\n\nProject: ${project.name}\n\nChoose schedule:`,
    buttons: [
      { type: 'action', text: '📅 Every Day', action: 'confirm_schedule', data: { projectId: project.id, schedule: 'daily' } },
      { type: 'action', text: '📅 Every Week', action: 'confirm_schedule', data: { projectId: project.id, schedule: 'weekly' } },
      { type: 'action', text: '📅 Friday 5PM', action: 'confirm_schedule', data: { projectId: project.id, schedule: 'friday-5pm' } },
      { type: 'action', text: '📅 Monday 9AM', action: 'confirm_schedule', data: { projectId: project.id, schedule: 'monday-9am' } },
    ]
  }
}
