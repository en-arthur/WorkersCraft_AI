import { getProjectButtons, getCreateProjectButtons } from './buttons'

export function formatSlackBlocks(data) {
  if (data.blocks) return data.blocks
  
  const blocks = []
  
  // Add text
  if (data.text) {
    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: data.text
      }
    })
  }
  
  // Add buttons
  if (data.buttons && data.buttons.length > 0) {
    const elements = data.buttons.map(btn => {
      if (btn.type === 'url') {
        return {
          type: 'button',
          text: { type: 'plain_text', text: btn.text },
          url: btn.url
        }
      } else {
        const actionData = JSON.stringify(btn.data)
        const actionId = `${btn.action}:${actionData}`.slice(0, 255)
        return {
          type: 'button',
          text: { type: 'plain_text', text: btn.text },
          action_id: actionId,
          style: btn.style === 'primary' ? 'primary' : btn.style === 'danger' ? 'danger' : undefined
        }
      }
    })
    
    // Split into rows of 5 buttons max
    for (let i = 0; i < elements.length; i += 5) {
      blocks.push({
        type: 'actions',
        elements: elements.slice(i, i + 5)
      })
    }
  }
  
  return blocks
}

export function formatProjectListMessage(projects) {
  const blocks = [
    {
      type: 'header',
      text: { type: 'plain_text', text: `📁 Your Projects (${projects.length})` }
    }
  ]
  
  projects.forEach(project => {
    const status = project.deployed_url ? '✅ Deployed' : '📝 Draft'
    const lastEdited = getRelativeTime(project.updated_at)
    
    blocks.push(
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*${project.name}*\nLast edited: ${lastEdited}\nStatus: ${status}${project.deployed_url ? `\n🌐 ${project.deployed_url}` : ''}`
        }
      },
      {
        type: 'actions',
        elements: getProjectButtons(project).map(btn => {
          if (btn.type === 'url') {
            return {
              type: 'button',
              text: { type: 'plain_text', text: btn.text },
              url: btn.url
            }
          } else {
            return {
              type: 'button',
              text: { type: 'plain_text', text: btn.text },
              action_id: `${btn.action}:${JSON.stringify(btn.data)}`.slice(0, 255),
              style: btn.style === 'primary' ? 'primary' : btn.style === 'danger' ? 'danger' : undefined
            }
          }
        })
      },
      { type: 'divider' }
    )
  })
  
  blocks.push({
    type: 'actions',
    elements: [{
      type: 'button',
      text: { type: 'plain_text', text: '➕ Create New Project' },
      action_id: 'create_project:{}',
      style: 'primary'
    }]
  })
  
  return blocks
}

export function formatProjectStatusMessage(project) {
  const status = project.deployed_url ? '✅ Deployed' : '📝 Draft'
  const lastEdited = getRelativeTime(project.updated_at)
  
  return {
    blocks: [
      {
        type: 'header',
        text: { type: 'plain_text', text: `📊 ${project.name}` }
      },
      {
        type: 'section',
        fields: [
          { type: 'mrkdwn', text: `*Template:*\n${project.template}` },
          { type: 'mrkdwn', text: `*Status:*\n${status}` },
          { type: 'mrkdwn', text: `*Last updated:*\n${lastEdited}` },
          { type: 'mrkdwn', text: `*Files:*\n${project.file_count || 0}` }
        ]
      },
      ...(project.deployed_url ? [{
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `🌐 *Live URL:*\n${project.deployed_url}`
        }
      }] : []),
      {
        type: 'actions',
        elements: getProjectButtons(project).map(btn => {
          if (btn.type === 'url') {
            return {
              type: 'button',
              text: { type: 'plain_text', text: btn.text },
              url: btn.url
            }
          } else {
            return {
              type: 'button',
              text: { type: 'plain_text', text: btn.text },
              action_id: `${btn.action}:${JSON.stringify(btn.data)}`,
              style: btn.style === 'primary' ? 'primary' : btn.style === 'danger' ? 'danger' : undefined
            }
          }
        })
      }
    ]
  }
}

export function getWelcomeMessage() {
  return {
    blocks: [
      {
        type: 'header',
        text: { type: 'plain_text', text: '👋 Welcome to WorkersCraft AI!' }
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: 'Build and deploy apps directly from Slack.\n\n*Quick Commands:*\n• `/workerscraft list` - View your projects\n• `/workerscraft new` - Create a project\n• `/workerscraft deploy <project>` - Deploy a project\n• `/workerscraft help` - Show all commands\n\n💡 *Tip:* Most actions can be done with buttons - no typing needed!'
        }
      },
      {
        type: 'actions',
        elements: [
          {
            type: 'button',
            text: { type: 'plain_text', text: '📁 View Projects' },
            action_id: 'list_projects:{}',
            style: 'primary'
          },
          {
            type: 'button',
            text: { type: 'plain_text', text: '➕ Create Project' },
            action_id: 'create_project:{}'
          },
          {
            type: 'button',
            text: { type: 'plain_text', text: '❓ Help' },
            action_id: 'help:{}'
          }
        ]
      }
    ]
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
