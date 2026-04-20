import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export const PLAN_LIMITS = {
  starter: { projectsPerMonth: 12,       androidDebug: true,  androidRelease: false, iosBuilds: false },
  pro:     { projectsPerMonth: 30,       androidDebug: true,  androidRelease: true,  iosBuilds: false },
  max:     { projectsPerMonth: Infinity, androidDebug: true,  androidRelease: true,  iosBuilds: true  },
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

export async function getMonthlyProjectCount(userId) {
  const startOfMonth = new Date()
  startOfMonth.setDate(1)
  startOfMonth.setHours(0, 0, 0, 0)

  const { count } = await supabase
    .from('projects')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('created_at', startOfMonth.toISOString())

  return count || 0
}
