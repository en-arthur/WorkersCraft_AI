import { getProjectButtons, getCreateProjectButtons } from './buttons'

export function formatTelegramMessage(data) {
  const message = {
    text: data.text || '',
    parse_mode: 'Markdown'
  }
  
  if (data.buttons && data.buttons.length > 0) {
    const keyboard = []
    
    // Group buttons into rows (2-3 per row)
    for (let i = 0; i < data.buttons.length; i += 2) {
      const row = data.buttons.slice(i, i + 2).map(btn => {
        if (btn.type === 'url') {
          return {
            text: btn.text,
            url: btn.url
          }
        } else {
          return {
            text: btn.text,
            callback_data: `${btn.action}:${JSON.stringify(btn.data)}`
          }
        }
      })
      keyboard.push(row)
    }
    
    message.reply_markup = {
      inline_keyboard: keyboard
    }
  }
  
  return message
}

export function formatProjectListMessage(projects) {
  let text = `📁 *Your Projects (${projects.length})*\n\n`
  
  const keyboard = []
  
  projects.forEach((project, index) => {
    const status = project.deployed_url ? '✅ Deployed' : '📝 Draft'
    const lastEdited = getRelativeTime(project.updated_at)
    
    text += `${index + 1}. *${project.name}*\n`
    text += `   Template: ${project.template}\n`
    text += `   Last edited: ${lastEdited}\n`
    text += `   Status: ${status}\n`
    if (project.deployed_url) {
      text += `   🌐 ${project.deployed_url}\n`
    }
    text += `\n`
    
    // Add project buttons
    const buttons = getProjectButtons(project)
    for (let i = 0; i < buttons.length; i += 3) {
      const row = buttons.slice(i, i + 3).map(btn => {
        if (btn.type === 'url') {
          return { text: btn.text, url: btn.url }
        } else {
          return {
            text: btn.text,
            callback_data: `${btn.action}:${JSON.stringify(btn.data)}`
          }
        }
      })
      keyboard.push(row)
    }
    
    // Add separator
    keyboard.push([{ text: '─────────', callback_data: 'separator' }])
  })
  
  // Add create button
  keyboard.push([{
    text: '➕ Create New Project',
    callback_data: 'create_project:{}'
  }])
  
  return {
    text,
    parse_mode: 'Markdown',
    reply_markup: { inline_keyboard: keyboard }
  }
}

export function formatProjectStatusMessage(project) {
  const status = project.deployed_url ? '✅ Deployed' : '📝 Draft'
  const lastEdited = getRelativeTime(project.updated_at)
  
  let text = `📊 *${project.name}*\n\n`
  text += `Template: ${project.template}\n`
  text += `Status: ${status}\n`
  text += `Last updated: ${lastEdited}\n`
  text += `Files: ${project.file_count || 0}\n`
  
  if (project.deployed_url) {
    text += `\n🌐 *Live URL:*\n${project.deployed_url}\n`
  }
  
  const keyboard = []
  const buttons = getProjectButtons(project)
  
  for (let i = 0; i < buttons.length; i += 2) {
    const row = buttons.slice(i, i + 2).map(btn => {
      if (btn.type === 'url') {
        return { text: btn.text, url: btn.url }
      } else {
        return {
          text: btn.text,
          callback_data: `${btn.action}:${JSON.stringify(btn.data)}`
        }
      }
    })
    keyboard.push(row)
  }
  
  return {
    text,
    parse_mode: 'Markdown',
    reply_markup: { inline_keyboard: keyboard }
  }
}

export function getWelcomeMessage() {
  return {
    text: `👋 *Welcome to WorkersCraft AI!*\n\nBuild and deploy apps directly from Telegram.\n\n*Quick Commands:*\n• /list - View your projects\n• /new - Create a project\n• /deploy <project> - Deploy a project\n• /help - Show all commands\n\n💡 *Tip:* Most actions can be done with buttons - no typing needed!`,
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [
        [
          { text: '📁 View Projects', callback_data: 'list_projects:{}' },
          { text: '➕ Create Project', callback_data: 'create_project:{}' }
        ],
        [
          { text: '❓ Help', callback_data: 'help:{}' }
        ]
      ]
    }
  }
}

function getRelativeTime(date) {
  const now = new Date()
  const then = new Date(date)
  const diff = now - then
  
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)
  
  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago`
  return `${days}d ago`
}
