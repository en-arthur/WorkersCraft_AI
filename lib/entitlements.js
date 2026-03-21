import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export const PLAN_LIMITS = {
  starter: { projectsPerDay: 10, androidDebug: true, androidRelease: false, iosBuilds: false },
  pro:     { projectsPerDay: 30, androidDebug: true, androidRelease: true,  iosBuilds: false },
  max:     { projectsPerDay: Infinity, androidDebug: true, androidRelease: true, iosBuilds: false },
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
