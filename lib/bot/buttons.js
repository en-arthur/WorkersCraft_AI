// Button action constants
export const BUTTON_ACTIONS = {
  // Project Management
  LIST_PROJECTS: 'list_projects',
  CREATE_PROJECT: 'create_project',
  OPEN_PROJECT: 'open_project',
  DELETE_PROJECT: 'delete_project',
  
  // Deployment
  DEPLOY: 'deploy',
  CONFIRM_DEPLOY: 'confirm_deploy',
  CANCEL_DEPLOY: 'cancel_deploy',
  REDEPLOY: 'redeploy',
  VIEW_LOGS: 'view_logs',
  
  // Project Creation
  SELECT_PLATFORM: 'select_platform',
  SELECT_STACK: 'select_stack',
  
  // Settings
  SETTINGS: 'settings',
  TOGGLE_AUTO_DEPLOY: 'toggle_auto_deploy',
  TOGGLE_NOTIFICATION: 'toggle_notification',
  SAVE_SETTINGS: 'save_settings',
  
  // Sharing
  SHARE: 'share',
  COPY_LINK: 'copy_link',
  
  // Scheduling
  SCHEDULE_DEPLOY: 'schedule_deploy',
  VIEW_SCHEDULES: 'view_schedules',
  CANCEL_SCHEDULE: 'cancel_schedule',
  
  // Navigation
  BACK: 'back',
  CANCEL: 'cancel',
  HELP: 'help',
  
  // Confirmation
  CONFIRM: 'confirm',
  CONFIRM_DELETE: 'confirm_delete',
}

export const BUTTON_STYLES = {
  PRIMARY: 'primary',
  SECONDARY: 'secondary',
  DANGER: 'danger',
}

export class ButtonBuilder {
  constructor() {
    this.buttons = []
  }
  
  addAction(text, action, data = {}, style = 'secondary') {
    this.buttons.push({
      type: 'action',
      text,
      action,
      data,
      style
    })
    return this
  }
  
  addUrl(text, url) {
    this.buttons.push({
      type: 'url',
      text,
      url
    })
    return this
  }
  
  build() {
    return this.buttons
  }
}

export function getProjectButtons(project) {
  const builder = new ButtonBuilder()
  
  if (!project.deployed_url) {
    builder.addAction('🚀 Deploy', BUTTON_ACTIONS.DEPLOY, 
      { projectId: project.id }, BUTTON_STYLES.PRIMARY)
  } else {
    builder.addUrl('👁️ View Site', project.deployed_url)
    builder.addAction('🔄 Redeploy', BUTTON_ACTIONS.REDEPLOY, 
      { projectId: project.id })
  }
  
  builder.addUrl('🌐 Open', `${process.env.NEXT_PUBLIC_SITE_URL}/chat/${project.id}`)
  builder.addAction('⚙️ Settings', BUTTON_ACTIONS.SETTINGS, 
    { projectId: project.id })
  builder.addAction('⏰ Schedule', BUTTON_ACTIONS.SCHEDULE_DEPLOY,
    { projectId: project.id })
  builder.addAction('🗑️ Delete', BUTTON_ACTIONS.DELETE_PROJECT, 
    { projectId: project.id }, BUTTON_STYLES.DANGER)
  
  return builder.build()
}

export function getCreateProjectButtons(step, context = {}) {
  const builder = new ButtonBuilder()
  
  switch (step) {
    case 'platform':
      builder.addAction('🌐 Web App', BUTTON_ACTIONS.SELECT_PLATFORM, 
        { platform: 'web' }, BUTTON_STYLES.PRIMARY)
      builder.addAction('📱 Mobile App', BUTTON_ACTIONS.SELECT_PLATFORM, 
        { platform: 'mobile' }, BUTTON_STYLES.PRIMARY)
      builder.addAction('❌ Cancel', BUTTON_ACTIONS.CANCEL)
      break
      
    case 'stack':
      if (context.platform === 'web') {
        builder.addAction('⚡ Next.js', BUTTON_ACTIONS.SELECT_STACK, 
          { stack: 'nextjs-developer' })
        builder.addAction('🟢 Vue.js', BUTTON_ACTIONS.SELECT_STACK, 
          { stack: 'vue-developer' })
        builder.addAction('🎨 Streamlit', BUTTON_ACTIONS.SELECT_STACK, 
          { stack: 'streamlit-developer' })
        builder.addAction('🎭 Gradio', BUTTON_ACTIONS.SELECT_STACK, 
          { stack: 'gradio-developer' })
      } else {
        builder.addAction('📱 Expo', BUTTON_ACTIONS.SELECT_STACK, 
          { stack: 'expo-developer' })
      }
      builder.addAction('⬅️ Back', BUTTON_ACTIONS.BACK)
      break
      
    case 'complete':
      builder.addUrl('🌐 Open in WorkersCraft', 
        `${process.env.NEXT_PUBLIC_SITE_URL}/chat/${context.projectId}`)
      builder.addAction('🚀 Deploy Empty', BUTTON_ACTIONS.DEPLOY, 
        { projectId: context.projectId })
      break
  }
  
  return builder.build()
}

export function getConfirmationButtons(action, data) {
  const builder = new ButtonBuilder()
  
  builder.addAction('✅ Confirm', `confirm_${action}`, data, BUTTON_STYLES.PRIMARY)
  builder.addAction('❌ Cancel', BUTTON_ACTIONS.CANCEL)
  
  return builder.build()
}
