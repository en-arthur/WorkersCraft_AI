import { createClient } from '@supabase/supabase-js'
import { getUserPlan, getTotalProjectCount, getMonthlyProjectCount, PLAN_LIMITS } from '@/lib/entitlements'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function GET(request) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return Response.json({ plan: 'free', projectCount: 0 })

  const { data: { user } } = await supabase.auth.getUser(token)
  if (!user) return Response.json({ plan: 'free', projectCount: 0 })

  const plan = await getUserPlan(user.id)
  const projectCount = plan.plan === 'free'
    ? await getTotalProjectCount(user.id)
    : await getMonthlyProjectCount(user.id)

  return Response.json({ plan: plan.plan, projectCount })
}
