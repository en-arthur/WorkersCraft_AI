import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export const PLAN_LIMITS = {
  starter: { projectsPerDay: 10, iosBuilds: false },
  pro:     { projectsPerDay: 30, iosBuilds: true },
  max:     { projectsPerDay: Infinity, iosBuilds: true },
}

export async function getUserPlan(userId) {
  const { data } = await supabase
    .from('user_subscriptions')
    .select('plan, status, current_period_end')
    .eq('user_id', userId)
    .eq('status', 'active')
    .single()
  return data || null
}

export async function getDailyProjectCount(userId) {
  const startOfDay = new Date()
  startOfDay.setHours(0, 0, 0, 0)

  const { count } = await supabase
    .from('projects')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('created_at', startOfDay.toISOString())

  return count || 0
}
