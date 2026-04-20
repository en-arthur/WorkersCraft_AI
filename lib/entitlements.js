import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export const PLAN_LIMITS = {
  free:    { projectsTotal: 1,        projectsPerMonth: 0,        canBuild: true,  canDeploy: false, androidDebug: false, androidRelease: false, iosBuilds: false },
  starter: { projectsTotal: Infinity, projectsPerMonth: 12,       canBuild: true,  canDeploy: true,  androidDebug: true,  androidRelease: false, iosBuilds: false },
  pro:     { projectsTotal: Infinity, projectsPerMonth: 30,       canBuild: true,  canDeploy: true,  androidDebug: true,  androidRelease: true,  iosBuilds: false },
  max:     { projectsTotal: Infinity, projectsPerMonth: Infinity, canBuild: true,  canDeploy: true,  androidDebug: true,  androidRelease: true,  iosBuilds: true  },
}

export async function getUserPlan(userId) {
  const { data } = await supabase
    .from('user_subscriptions')
    .select('plan, status, current_period_end')
    .eq('user_id', userId)
    .eq('status', 'active')
    .single()
  // Return free plan if no active subscription
  return data || { plan: 'free', status: 'active' }
}

export async function getTotalProjectCount(userId) {
  const { count } = await supabase
    .from('projects')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
  return count || 0
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
