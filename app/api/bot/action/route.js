import { createClient } from '@supabase/supabase-js'
import { BUTTON_ACTIONS, getCreateProjectButtons } from '@/lib/bot/buttons'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function POST(request) {
  const { action, data, userId, integrationId, platform } = await request.json()
  
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
        response = {
          text: `🚀 Deploying project...\n\n⏳ This may take 30-60 seconds\n████░░░░░░ 40%`,
          update_message: true,
        }
        
        // Trigger actual deployment in background
        fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/deploy`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ projectId: data.projectId, userId })
        }).catch(console.error)
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
          text: `📚 *WorkersCraft AI Bot Commands*\n\n*Project Management:*\n/list - Show all your projects\n/new - Create a new project\n/status <project> - Get project status\n\n*Deployment:*\n/deploy <project> - Deploy to Vercel\n\n*Utility:*\n/help - Show this help message\n\n💡 *Tip:* Most actions can be done with buttons - no typing needed!`,
          update_message: true,
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
