import fs from 'fs'
import path from 'path'

export function generateBackendSDK(
  appId: string,
  apiUrl: string = process.env.NEXT_PUBLIC_CLOUDSERVICE_URL || 'https://cloud.workerscraft.com'
): string {
  // Read template
  const templatePath = path.join(process.cwd(), 'lib', 'sdk-templates', 'backend.js.template')
  const template = fs.readFileSync(templatePath, 'utf-8')
  
  // Replace placeholders
  const sdk = template
    .replace(/\{\{API_URL\}\}/g, apiUrl)
    .replace(/\{\{APP_ID\}\}/g, appId)
  
  return sdk
}

export function generatePlaceholderSDK(status: 'pending' | 'error', message: string): string {
  return `/**
 * WorkersCraft Backend SDK - ${status.toUpperCase()}
 * ${message}
 */

export const backend = {
  status: '${status}',
  message: '${message}',
  
  // Placeholder methods that throw helpful errors
  register: () => { throw new Error('${message}') },
  login: () => { throw new Error('${message}') },
  logout: () => {},
  getUser: () => { throw new Error('${message}') },
  create: () => { throw new Error('${message}') },
  list: () => { throw new Error('${message}') },
  get: () => { throw new Error('${message}') },
  update: () => { throw new Error('${message}') },
  delete: () => { throw new Error('${message}') },
  uploadFile: () => { throw new Error('${message}') },
  listFiles: () => { throw new Error('${message}') },
  deleteFile: () => { throw new Error('${message}') },
  isAuthenticated: () => false
}
`
}
