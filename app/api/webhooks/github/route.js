import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function POST(request) {
  try {
    const signature = request.headers.get('x-hub-signature-256')
    const body = await request.text()
    
    // Verify GitHub webhook signature
    const secret = process.env.GITHUB_WEBHOOK_SECRET
    if (secret) {
      const hmac = crypto.createHmac('sha256', secret)
      const digest = 'sha256=' + hmac.update(body).digest('hex')
      if (signature !== digest) {
        return Response.json({ error: 'Invalid signature' }, { status: 401 })
      }
    }

    const payload = JSON.parse(body)
    
    // Handle workflow_run events
    if (payload.action === 'completed' && payload.workflow_run) {
      const runId = payload.workflow_run.id.toString()
      const status = payload.workflow_run.conclusion === 'success' ? 'success' : 'failed'
      const repoUrl = payload.repository.html_url
      
      // Find deployment by github_run_id
      const { data: deployment } = await supabase
        .from('deployments')
        .select('*')
        .eq('github_run_id', runId)
        .single()

      if (deployment) {
        const updates = {
          status,
          completed_at: new Date().toISOString()
        }

        // Add artifact URL if successful
        if (status === 'success') {
          const artifactUrl = `${repoUrl}/actions/runs/${runId}`
          updates.artifact_url = artifactUrl
        }

        // Add error message if failed
        if (status === 'failed') {
          updates.error_message = 'Build failed. Check GitHub Actions logs for details.'
        }

        await supabase
          .from('deployments')
          .update(updates)
          .eq('id', deployment.id)

        // Send notification
        const { sendNotification } = await import('@/lib/bot/notifications')
        const { data: project } = await supabase
          .from('projects')
          .select('name')
          .eq('id', deployment.project_id)
          .single()

        if (status === 'success') {
          await sendNotification(deployment.user_id, 'deployment_success', {
            projectName: project?.name || 'Project',
            projectId: deployment.project_id,
            url: updates.artifact_url,
            platform: deployment.type
          })
        } else {
          await sendNotification(deployment.user_id, 'deployment_failed', {
            projectName: project?.name || 'Project',
            projectId: deployment.project_id,
            error: updates.error_message,
            platform: deployment.type
          })
        }
      }
    }

    return Response.json({ success: true })
  } catch (error) {
    console.error('GitHub webhook error:', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
