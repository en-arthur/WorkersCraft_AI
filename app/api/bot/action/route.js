import { createClient } from '@supabase/supabase-js'
import { BUTTON_ACTIONS, getCreateProjectButtons } from '@/lib/bot/buttons'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

export async function POST(request) {
  const { action, data, userId, integrationId, platform } = await request.json()
  
  const supabase = getSupabaseAdmin()
  const startTime = Date.now()
  
  try {
    let response
    
    switch (action) {
      case BUTTON_ACTIONS.LIST_PROJECTS:
        const { data: projects } = await supabase
          .from('projects')
          .select('*')
          .eq('user_id', userId)
          .order('updated_at', { ascending: false })
        
        if (platform === 'slack') {
          const slackFormatter = await import('@/lib/bot/slack-formatter')
          response = { blocks: slackFormatter.formatProjectListMessage(projects) }
        } else {
          const telegramFormatter = await import('@/lib/bot/telegram-formatter')
          response = telegramFormatter.formatProjectListMessage(projects)
        }
        break
        
      case BUTTON_ACTIONS.CREATE_PROJECT:
        await supabase.from('bot_sessions').insert({
          user_id: userId,
          integration_id: integrationId,
          state: 'creating_project',
          context: { step: 'platform' },
        })
        
        response = {
          text: '🎨 Choose Platform\n\nWhat type of app do you want to build?',
          buttons: getCreateProjectButtons('platform'),
          update_message: true,
        }
        break
        
      case BUTTON_ACTIONS.SELECT_PLATFORM:
        await supabase
          .from('bot_sessions')
          .update({
            context: { step: 'stack', platform: data.platform },
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', userId)
          .eq('integration_id', integrationId)
          .eq('state', 'creating_project')
        
        response = {
          text: '🛠️ Choose Tech Stack\n\nSelect your framework:',
          buttons: getCreateProjectButtons('stack', { platform: data.platform }),
          update_message: true,
        }
        break
        
      case BUTTON_ACTIONS.SELECT_STACK:
        const { data: session } = await supabase
          .from('bot_sessions')
          .select('*')
          .eq('user_id', userId)
          .eq('integration_id', integrationId)
          .eq('state', 'creating_project')
          .single()
        
        if (!session) {
          response = { text: '❌ Session expired. Please start over with /new' }
          break
        }
        
        const projectName = `my-${data.stack}-${Date.now()}`
        const { data: project } = await supabase
          .from('projects')
          .insert({
            user_id: userId,
            name: projectName,
            template: data.stack,
            status: 'draft',
          })
          .select()
          .single()
        
        await supabase.from('bot_sessions').delete().eq('id', session.id)
        
        response = {
          text: `✅ Project Created!\n\n📝 Name: ${projectName}\nTemplate: ${getTemplateName(data.stack)}\nStatus: Ready to build\n\nContinue building in web:`,
          buttons: getCreateProjectButtons('complete', { projectId: project.id }),
          update_message: true,
        }
        break
        
      case BUTTON_ACTIONS.DEPLOY:
        const { data: deployProject } = await supabase
          .from('projects')
          .select('*')
          .eq('id', data.projectId)
          .eq('user_id', userId)
          .single()
        
        if (!deployProject) {
          response = { text: '❌ Project not found' }
          break
        }
        
        response = {
          text: `⚠️ Deploy Confirmation\n\nProject: ${deployProject.name}\nTemplate: ${deployProject.template}\nTarget: Vercel\n\nThis will deploy your latest changes.`,
          buttons: [
            { type: 'action', text: '✅ Confirm Deploy', action: BUTTON_ACTIONS.CONFIRM_DEPLOY, data: { projectId: data.projectId }, style: 'primary' },
            { type: 'action', text: '❌ Cancel', action: BUTTON_ACTIONS.CANCEL, data: {} }
          ],
          update_message: true,
        }
        break
        
      case BUTTON_ACTIONS.CONFIRM_DEPLOY:
        // Send initial progress message
        response = {
          text: `🚀 Deploying project...\n\n⏳ Initializing deployment...\n████░░░░░░ 40%`,
          update_message: true,
        }
        
        // Get project details
        const { data: deployingProject } = await supabase
          .from('projects')
          .select('*')
          .eq('id', data.projectId)
          .eq('user_id', userId)
          .single()
        
        if (deployingProject) {
          // Trigger actual deployment in background
          fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/deploy`, {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
              projectId: data.projectId, 
              userId,
              fragment: deployingProject
            })
          }).catch(console.error)
        }
        break
        
      case BUTTON_ACTIONS.DELETE_PROJECT:
        const { data: deleteProject } = await supabase
          .from('projects')
          .select('name')
          .eq('id', data.projectId)
          .eq('user_id', userId)
          .single()
        
        if (!deleteProject) {
          response = { text: '❌ Project not found' }
          break
        }
        
        response = {
          text: `⚠️ Delete Confirmation\n\nAre you sure you want to delete "${deleteProject.name}"?\n\n⚠️ This action cannot be undone.`,
          buttons: [
            { type: 'action', text: '🗑️ Yes, Delete', action: BUTTON_ACTIONS.CONFIRM_DELETE, data: { projectId: data.projectId }, style: 'danger' },
            { type: 'action', text: '❌ Cancel', action: BUTTON_ACTIONS.CANCEL, data: {} }
          ],
          update_message: true,
        }
        break
        
      case BUTTON_ACTIONS.CONFIRM_DELETE:
        const { data: projectToDelete } = await supabase
          .from('projects')
          .select('name')
          .eq('id', data.projectId)
          .eq('user_id', userId)
          .single()
        
        if (!projectToDelete) {
          response = { text: '❌ Project not found' }
          break
        }
        
        await supabase
          .from('projects')
          .delete()
          .eq('id', data.projectId)
          .eq('user_id', userId)
        
        response = {
          text: `✅ Project "${projectToDelete.name}" has been deleted.`,
          buttons: [
            { type: 'action', text: '📁 View Projects', action: BUTTON_ACTIONS.LIST_PROJECTS, data: {} }
          ],
          update_message: true,
        }
        break
        
      case BUTTON_ACTIONS.CANCEL:
        response = {
          text: '❌ Action cancelled.',
          update_message: true,
        }
        break
        
      case BUTTON_ACTIONS.HELP:
        response = {
          text: `📚 *WorkersCraft AI Bot Commands*\n\n*Project Management:*\n/list - Show all your projects\n/new - Create a new project\n/status <project> - Get project status\n\n*Deployment:*\n/deploy <project> - Deploy to Vercel\n\n*Utility:*\n/help - Show this help message\n/settings - Configure preferences\n\n💡 *Tip:* Most actions can be done with buttons - no typing needed!`,
          update_message: true,
        }
        break
        
      case BUTTON_ACTIONS.TOGGLE_NOTIFICATION:
      case 'toggle_notification':
        // Get current preference
        const { data: currentPref } = await supabase
          .from('notification_preferences')
          .select('*')
          .eq('user_id', userId)
          .eq('integration_id', data.integrationId || integrationId)
          .eq('notification_type', data.type)
          .single()
        
        // Toggle it
        await supabase
          .from('notification_preferences')
          .upsert({
            user_id: userId,
            integration_id: data.integrationId || integrationId,
            notification_type: data.type,
            enabled: !currentPref?.enabled
          })
        
        // Return updated settings
        const { data: allPrefs } = await supabase
          .from('notification_preferences')
          .select('*')
          .eq('user_id', userId)
          .eq('integration_id', data.integrationId || integrationId)
        
        const prefMap = {}
        allPrefs?.forEach(pref => {
          prefMap[pref.notification_type] = pref.enabled
        })
        
        response = {
          text: `⚙️ *Bot Settings*\n\n*Notifications:*`,
          buttons: [
            {
              type: 'action',
              text: prefMap['deployment_success'] ? '✅ Deployment Success' : '❌ Deployment Success',
              action: 'toggle_notification',
              data: { type: 'deployment_success', integrationId: data.integrationId || integrationId }
            },
            {
              type: 'action',
              text: prefMap['deployment_failed'] ? '✅ Deployment Failed' : '❌ Deployment Failed',
              action: 'toggle_notification',
              data: { type: 'deployment_failed', integrationId: data.integrationId || integrationId }
            },
            {
              type: 'action',
              text: '💾 Save',
              action: 'save_settings',
              data: {},
              style: 'primary'
            }
          ],
          update_message: true,
        }
        break
        
      case BUTTON_ACTIONS.SAVE_SETTINGS:
      case 'save_settings':
        response = {
          text: '✅ Settings saved!',
          update_message: true,
        }
        break
        
      case BUTTON_ACTIONS.SCHEDULE_DEPLOY:
      case 'schedule_deploy':
        const { data: scheduleProject } = await supabase
          .from('projects')
          .select('name')
          .eq('id', data.projectId)
          .eq('user_id', userId)
          .single()
        
        if (!scheduleProject) {
          response = { text: '❌ Project not found' }
          break
        }
        
        response = {
          text: `⏰ Schedule Deployment\n\nProject: ${scheduleProject.name}\n\nChoose schedule:`,
          buttons: [
            { type: 'action', text: '📅 Every Day', action: 'confirm_schedule', data: { projectId: data.projectId, schedule: 'daily' } },
            { type: 'action', text: '📅 Every Week', action: 'confirm_schedule', data: { projectId: data.projectId, schedule: 'weekly' } },
            { type: 'action', text: '📅 Friday 5PM', action: 'confirm_schedule', data: { projectId: data.projectId, schedule: 'friday-5pm' } },
            { type: 'action', text: '📅 Monday 9AM', action: 'confirm_schedule', data: { projectId: data.projectId, schedule: 'monday-9am' } },
            { type: 'action', text: '📋 View Schedules', action: 'view_schedules', data: { projectId: data.projectId } },
            { type: 'action', text: '❌ Cancel', action: 'cancel', data: {} }
          ],
          update_message: true,
        }
        break
        
      case 'confirm_schedule':
        const scheduleResponse = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/schedules`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId,
            projectId: data.projectId,
            schedule: data.schedule
          })
        })
        
        const scheduleData = await scheduleResponse.json()
        
        if (scheduleData.success) {
          response = {
            text: `✅ Deployment Scheduled!\n\n${scheduleData.schedule.label}\nNext run: ${new Date(scheduleData.nextRun).toLocaleString()}`,
            buttons: [
              { type: 'action', text: '📋 View All Schedules', action: 'view_schedules', data: { projectId: data.projectId } }
            ],
            update_message: true,
          }
        } else {
          response = {
            text: `❌ Failed to schedule: ${scheduleData.error}`,
            update_message: true,
          }
        }
        break
        
      case BUTTON_ACTIONS.VIEW_SCHEDULES:
      case 'view_schedules':
        const schedulesResponse = await fetch(
          `${process.env.NEXT_PUBLIC_SITE_URL}/api/schedules?userId=${userId}${data.projectId ? `&projectId=${data.projectId}` : ''}`
        )
        
        const schedulesData = await schedulesResponse.json()
        
        if (schedulesData.schedules && schedulesData.schedules.length > 0) {
          let text = '📋 Scheduled Deployments\n\n'
          const buttons = []
          
          schedulesData.schedules.forEach((schedule, index) => {
            text += `${index + 1}. ${schedule.label}\n`
            text += `   Next run: ${new Date(schedule.next_run_at).toLocaleString()}\n`
            text += `   Status: ${schedule.enabled ? '✅ Active' : '❌ Disabled'}\n\n`
            
            buttons.push({
              type: 'action',
              text: `🗑️ Cancel #${index + 1}`,
              action: 'cancel_schedule',
              data: { scheduleId: schedule.id }
            })
          })
          
          response = {
            text,
            buttons,
            update_message: true,
          }
        } else {
          response = {
            text: '📋 No scheduled deployments',
            update_message: true,
          }
        }
        break
        
      case BUTTON_ACTIONS.CANCEL_SCHEDULE:
      case 'cancel_schedule':
        const cancelResponse = await fetch(
          `${process.env.NEXT_PUBLIC_SITE_URL}/api/schedules?id=${data.scheduleId}&userId=${userId}`,
          { method: 'DELETE' }
        )
        
        const cancelData = await cancelResponse.json()
        
        if (cancelData.success) {
          response = {
            text: '✅ Schedule cancelled',
            update_message: true,
          }
        } else {
          response = {
            text: '❌ Failed to cancel schedule',
            update_message: true,
          }
        }
        break
        
      default:
        response = { text: '❌ Unknown action' }
    }
    
    // Log interaction
    await supabase.from('bot_interactions').insert({
      user_id: userId,
      integration_id: integrationId,
      interaction_type: 'button',
      action,
      project_id: data.projectId,
      success: true,
      response_time_ms: Date.now() - startTime,
    })
    
    return Response.json(response)
    
  } catch (error) {
    console.error('Action error:', error)
    
    await supabase.from('bot_interactions').insert({
      user_id: userId,
      integration_id: integrationId,
      interaction_type: 'button',
      action,
      project_id: data?.projectId,
      success: false,
      error_message: error.message,
      response_time_ms: Date.now() - startTime,
    })
    
    return Response.json({
      text: '❌ An error occurred. Please try again.',
    }, { status: 500 })
  }
}

function getTemplateName(stack) {
  const names = {
    'nextjs-developer': 'Next.js ⚡',
    'vue-developer': 'Vue.js 🟢',
    'streamlit-developer': 'Streamlit 🎨',
    'gradio-developer': 'Gradio 🎭',
    'expo-developer': 'Expo 📱',
  }
  return names[stack] || stack
}
