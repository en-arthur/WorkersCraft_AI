const CLOUDSERVICE_URL = process.env.NEXT_PUBLIC_CLOUDSERVICE_URL || 'https://api.workercraft.dev'

export async function registerAppWithRetry(
  projectId: string,
  projectName: string,
  ownerId: string,
  maxRetries: number = 3
): Promise<string | null> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`[CloudService] Registering app (attempt ${attempt}/${maxRetries})...`)
      
      const response = await fetch(`${CLOUDSERVICE_URL}/api/apps/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: projectId,
          name: projectName,
          owner_id: ownerId
        })
      })
      
      if (!response.ok) {
        const error = await response.json()
        console.error(`[CloudService] Registration failed:`, error)
        throw new Error(error.error?.message || 'Registration failed')
      }
      
      const { app_id } = await response.json()
      console.log(`[CloudService] App registered successfully: ${app_id}`)
      return app_id
      
    } catch (error) {
      console.error(`[CloudService] Attempt ${attempt} failed:`, error)
      
      if (attempt === maxRetries) {
        console.error(`[CloudService] All ${maxRetries} attempts failed`)
        return null
      }
      
      // Exponential backoff: 2s, 4s, 8s
      const delay = Math.pow(2, attempt) * 1000
      console.log(`[CloudService] Retrying in ${delay}ms...`)
      await new Promise(r => setTimeout(r, delay))
    }
  }
  
  return null
}

export async function updateProjectBackendStatus(
  projectId: string,
  status: 'pending' | 'active' | 'registration_failed',
  appId?: string
) {
  try {
    const body: any = { backend_status: status }
    
    if (status === 'active' && appId) {
      body.backend_app_id = appId
      body.backend_registered_at = new Date().toISOString()
    }
    
    const response = await fetch(`/api/projects/${projectId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    })
    
    if (!response.ok) {
      throw new Error('Failed to update project status')
    }
    
    return true
  } catch (error) {
    console.error('[CloudService] Failed to update project status:', error)
    return false
  }
}
