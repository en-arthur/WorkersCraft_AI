import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function POST(request) {
  const { userId, projectId, schedule } = await request.json()
  
  if (!userId || !projectId || !schedule) {
    return Response.json({ error: 'Missing required fields' }, { status: 400 })
  }
  
  try {
    // Calculate next run time
    const nextRun = calculateNextRun(schedule)
    
    // Create scheduled deployment
    const { data, error } = await supabase
      .from('scheduled_deployments')
      .insert({
        user_id: userId,
        project_id: projectId,
        cron_expression: getCronExpression(schedule),
        label: getScheduleLabel(schedule),
        next_run_at: nextRun.toISOString(),
        enabled: true
      })
      .select()
      .single()
    
    if (error) throw error
    
    return Response.json({ 
      success: true,
      schedule: data,
      nextRun: nextRun.toISOString()
    })
    
  } catch (error) {
    console.error('Schedule error:', error)
    return Response.json({ error: error.message }, { status: 500 })
  }
}

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const userId = searchParams.get('userId')
  const projectId = searchParams.get('projectId')
  
  if (!userId) {
    return Response.json({ error: 'User ID required' }, { status: 400 })
  }
  
  let query = supabase
    .from('scheduled_deployments')
    .select('*')
    .eq('user_id', userId)
  
  if (projectId) {
    query = query.eq('project_id', projectId)
  }
  
  const { data, error } = await query
  
  if (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }
  
  return Response.json({ schedules: data })
}

export async function DELETE(request) {
  const { searchParams } = new URL(request.url)
  const scheduleId = searchParams.get('id')
  const userId = searchParams.get('userId')
  
  if (!scheduleId || !userId) {
    return Response.json({ error: 'Missing required fields' }, { status: 400 })
  }
  
  const { error } = await supabase
    .from('scheduled_deployments')
    .delete()
    .eq('id', scheduleId)
    .eq('user_id', userId)
  
  if (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }
  
  return Response.json({ success: true })
}

function getCronExpression(schedule) {
  const schedules = {
    'daily': '0 0 * * *',
    'weekly': '0 0 * * 0',
    'friday-5pm': '0 17 * * 5',
    'monday-9am': '0 9 * * 1',
  }
  
  return schedules[schedule] || '0 0 * * *'
}

function getScheduleLabel(schedule) {
  const labels = {
    'daily': 'Every day at midnight',
    'weekly': 'Every Sunday at midnight',
    'friday-5pm': 'Every Friday at 5:00 PM',
    'monday-9am': 'Every Monday at 9:00 AM',
  }
  
  return labels[schedule] || schedule
}

function calculateNextRun(schedule) {
  const now = new Date()
  const next = new Date(now)
  
  switch (schedule) {
    case 'daily':
      next.setDate(next.getDate() + 1)
      next.setHours(0, 0, 0, 0)
      break
      
    case 'weekly':
      next.setDate(next.getDate() + (7 - next.getDay()))
      next.setHours(0, 0, 0, 0)
      break
      
    case 'friday-5pm':
      const daysUntilFriday = (5 - next.getDay() + 7) % 7 || 7
      next.setDate(next.getDate() + daysUntilFriday)
      next.setHours(17, 0, 0, 0)
      if (next <= now) {
        next.setDate(next.getDate() + 7)
      }
      break
      
    case 'monday-9am':
      const daysUntilMonday = (1 - next.getDay() + 7) % 7 || 7
      next.setDate(next.getDate() + daysUntilMonday)
      next.setHours(9, 0, 0, 0)
      if (next <= now) {
        next.setDate(next.getDate() + 7)
      }
      break
      
    default:
      next.setDate(next.getDate() + 1)
      next.setHours(0, 0, 0, 0)
  }
  
  return next
}
