import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY // service role to bypass RLS
)

/**
 * Returns the user's active plan or null if no active subscription.
 */
export async function getUserPlan(userId) {
  const { data } = await supabase
    .from('user_subscriptions')
    .select('plan, status, current_period_end')
    .eq('user_id', userId)
    .eq('status', 'active')
    .single()
  return data || null
}
