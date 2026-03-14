import { createClient } from '@supabase/supabase-js'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

export async function GET(request) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = getSupabaseAdmin()

  try {
    const now = new Date().toISOString()
    
    // Get all schedules that need to run
    const { data: schedules, error } = await supabase
      .from('scheduled_deployments')
      .select('*, projects(*)')
      .eq('enabled', true)
      .lte('next_run_at', now)
    
    if (error) throw error
    
    if (!schedules || schedules.length === 0) {
      return Response.json({ 
        message: 'No schedules to run',
        processed: 0 
      })
    }
    
    const results = []
    
    // Process each schedule
    for (const schedule of schedules) {
      try {
        // Trigger deployment
        const deployResponse = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/deploy`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            projectId: schedule.project_id,
            userId: schedule.user_id,
            fragment: schedule.projects
          })
        })
        
        const deployData = await deployResponse.json()
        
        // Calculate next run time
        const nextRun = calculateNextRun(schedule.cron_expression)
        
        // Update schedule
        await supabase
          .from('scheduled_deployments')
          .update({
            last_run_at: now,
            next_run_at: nextRun.toISOString(),
            updated_at: now
          })
          .eq('id', schedule.id)
        
        results.push({
          scheduleId: schedule.id,
          projectId: schedule.project_id,
          status: deployResponse.ok ? 'success' : 'failed',
          nextRun: nextRun.toISOString(),
          error: deployResponse.ok ? null : deployData.error
        })
        
      } catch (error) {
        console.error(`Failed to process schedule ${schedule.id}:`, error)
        results.push({
          scheduleId: schedule.id,
          projectId: schedule.project_id,
          status: 'error',
          error: error.message
        })
      }
    }
    
    return Response.json({
      message: 'Schedules processed',
      processed: schedules.length,
      results
    })
    
  } catch (error) {
    console.error('Cron error:', error)
    return Response.json({ 
      error: error.message 
    }, { status: 500 })
  }
}

function calculateNextRun(cronExpression) {
  const now = new Date()
  const next = new Date(now)
  
  // Parse cron expression (minute hour day month dayOfWeek)
  const parts = cronExpression.split(' ')
  const minute = parseInt(parts[0])
  const hour = parseInt(parts[1])
  const dayOfMonth = parts[2]
  const month = parts[3]
  const dayOfWeek = parts[4]
  
  // Daily: 0 0 * * *
  if (dayOfMonth === '*' && month === '*' && dayOfWeek === '*') {
    next.setDate(next.getDate() + 1)
    next.setHours(hour, minute, 0, 0)
    return next
  }
  
  // Weekly: 0 0 * * 0 (Sunday)
  if (dayOfMonth === '*' && month === '*' && dayOfWeek !== '*') {
    const targetDay = parseInt(dayOfWeek)
    const daysUntilTarget = (targetDay - next.getDay() + 7) % 7 || 7
    next.setDate(next.getDate() + daysUntilTarget)
    next.setHours(hour, minute, 0, 0)
    return next
  }
  
  // Default: add 1 day
  next.setDate(next.getDate() + 1)
  next.setHours(hour, minute, 0, 0)
  return next
}
