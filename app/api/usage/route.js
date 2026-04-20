import { createClient } from '@supabase/supabase-js'
import { getUserPlan, getMonthlyProjectCount, getTotalProjectCount, PLAN_LIMITS } from '@/lib/entitlements'

export const dynamic = 'force-dynamic'

export async function GET(request) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      { global: { headers: { Authorization: `Bearer ${token}` } } }
    )
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const plan = await getUserPlan(user.id)
    const limits = PLAN_LIMITS[plan.plan] || PLAN_LIMITS.free

    if (plan.plan === 'free') {
      const count = await getTotalProjectCount(user.id)
      return Response.json({ count, limit: limits.projectsTotal, plan: 'free', label: 'Projects total' })
    }

    const count = await getMonthlyProjectCount(user.id)
    return Response.json({
      count,
      limit: limits.projectsPerMonth === Infinity ? null : limits.projectsPerMonth,
      plan: plan.plan,
      label: 'Projects this month',
    })
  } catch (err) {
    console.error('[usage]', err)
    return Response.json({ error: 'Failed to fetch usage' }, { status: 500 })
  }
}
