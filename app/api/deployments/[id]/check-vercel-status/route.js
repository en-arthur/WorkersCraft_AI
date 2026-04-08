import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

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

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function GET(request, { params }) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get deployment from DB
    const { data: deployment, error: dbError } = await supabase
      .from('deployments')
      .select('*')
      .eq('id', params.id)
      .eq('user_id', user.id)
      .single()

    if (dbError || !deployment) {
      return Response.json({ error: 'Deployment not found' }, { status: 404 })
    }

    // If already terminal state, return as-is
    if (['success', 'failed'].includes(deployment.status)) {
      return Response.json({ 
        status: deployment.status,
        deployment_url: deployment.deployment_url,
        error_message: deployment.error_message
      })
    }

    // Get Vercel token
    const { data: integration } = await supabase
      .from('user_integrations')
      .select('access_token')
      .eq('user_id', user.id)
      .eq('integration_type', 'vercel')
      .single()

    if (!integration?.access_token) {
      return Response.json({ error: 'Vercel token not found' }, { status: 400 })
    }

    const vercelToken = decrypt(integration.access_token)

    // Check Vercel deployment status
    const vercelRes = await fetch(
      `https://api.vercel.com/v13/deployments/${deployment.vercel_deployment_id}`,
      {
        headers: { 'Authorization': `Bearer ${vercelToken}` }
      }
    )

    if (!vercelRes.ok) {
      return Response.json({ error: 'Failed to fetch Vercel status' }, { status: 500 })
    }

    const vercelData = await vercelRes.json()
    
    // Map Vercel readyState to our status
    let newStatus = deployment.status
    let deploymentUrl = deployment.deployment_url
    let errorMessage = deployment.error_message

    switch (vercelData.readyState) {
      case 'READY':
        newStatus = 'success'
        deploymentUrl = `https://${vercelData.url}`
        break
      case 'ERROR':
      case 'CANCELED':
        newStatus = 'failed'
        errorMessage = vercelData.errorMessage || 'Deployment failed'
        break
      case 'QUEUED':
      case 'INITIALIZING':
      case 'BUILDING':
        newStatus = 'building'
        break
    }

    // Update DB if status changed
    if (newStatus !== deployment.status) {
      await supabase
        .from('deployments')
        .update({
          status: newStatus,
          deployment_url: deploymentUrl,
          error_message: errorMessage,
          completed_at: ['success', 'failed'].includes(newStatus) ? new Date().toISOString() : null
        })
        .eq('id', params.id)

      // Update project deployed_url when ready
      if (newStatus === 'success' && deployment.project_id) {
        await supabase
          .from('projects')
          .update({ deployed_url: deploymentUrl, updated_at: new Date().toISOString() })
          .eq('id', deployment.project_id)

        // Send success notification
        try {
          const { sendNotification } = await import('@/lib/bot/notifications')
          const { data: project } = await supabase.from('projects').select('name').eq('id', deployment.project_id).single()
          await sendNotification(deployment.user_id, 'deployment_success', {
            projectName: project?.name || 'Project',
            projectId: deployment.project_id,
            url: deploymentUrl,
          })
        } catch {}
      }
    }

    return Response.json({
      status: newStatus,
      deployment_url: deploymentUrl,
      error_message: errorMessage,
      vercel_ready_state: vercelData.readyState
    })
  } catch (error) {
    console.error('Error checking Vercel status:', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
