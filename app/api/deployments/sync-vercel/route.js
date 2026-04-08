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

export async function POST(request) {
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

    // Get Vercel token
    const { data: integration } = await supabase
      .from('user_integrations')
      .select('access_token')
      .eq('user_id', user.id)
      .eq('integration_type', 'vercel')
      .single()

    if (!integration?.access_token) {
      return Response.json({ synced: 0, updated: 0, total: 0 })
    }

    const vercelToken = decrypt(integration.access_token)

    // Fetch deployments from Vercel
    const vercelRes = await fetch('https://api.vercel.com/v6/deployments?limit=50', {
      headers: { 'Authorization': `Bearer ${vercelToken}` }
    })

    if (!vercelRes.ok) {
      return Response.json({ error: 'Failed to fetch from Vercel' }, { status: 500 })
    }

    const vercelData = await vercelRes.json()
    let synced = 0
    let updated = 0

    for (const deployment of vercelData.deployments || []) {
      // Map Vercel status to our status
      let status = 'building'
      if (deployment.readyState === 'READY' || deployment.state === 'READY') {
        status = 'success'
      } else if (deployment.readyState === 'ERROR' || deployment.readyState === 'CANCELED' || deployment.state === 'ERROR' || deployment.state === 'CANCELED') {
        status = 'failed'
      }

      // Check if this deployment already exists for THIS user
      const { data: existing } = await supabase
        .from('deployments')
        .select('id, status, project_id')
        .eq('vercel_deployment_id', deployment.uid)
        .eq('user_id', user.id)
        .single()

      if (existing) {
        // Update only if status changed
        if (existing.status !== status) {
          await supabase
            .from('deployments')
            .update({
              status,
              deployment_url: deployment.url ? `https://${deployment.url}` : null,
              completed_at: status === 'success' || status === 'failed' ? new Date().toISOString() : null
            })
            .eq('id', existing.id)
          updated++
        }
      } else {
        // Insert new deployment for this user
        const { error: insertError } = await supabase
          .from('deployments')
          .insert({
            user_id: user.id,
            vercel_deployment_id: deployment.uid,
            type: 'web',
            platform: 'vercel',
            status,
            deployment_url: deployment.url ? `https://${deployment.url}` : null,
            created_at: new Date(deployment.created).toISOString(),
            started_at: deployment.buildingAt ? new Date(deployment.buildingAt).toISOString() : null,
            completed_at: deployment.ready && (status === 'success' || status === 'failed') ? new Date(deployment.ready).toISOString() : null,
            error_message: deployment.errorMessage || null
          })
        
        if (!insertError) synced++
      }
    }

    return Response.json({ synced, updated, total: vercelData.deployments?.length || 0 })
  } catch (error) {
    console.error('Sync error:', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
