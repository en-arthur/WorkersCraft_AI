import { createClient } from '@supabase/supabase-js'
import { createConversionIfMissing } from '@/lib/affiliate-conversion'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function POST(request) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: { user }, error: authError } = await supabase.auth.getUser(token)
  if (authError || !user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { ref_code } = await request.json()
  if (!ref_code) return Response.json({ ok: true })

  // Check if already referred
  const { data: existing } = await supabase
    .from('user_referrals')
    .select('referred_by')
    .eq('user_id', user.id)
    .single()

  const effectiveRefCode = existing?.referred_by || ref_code

  if (!existing?.referred_by) {
    // First time — verify affiliate is approved before saving
    const { data: check } = await supabase
      .from('affiliates')
      .select('id')
      .eq('ref_code', ref_code)
      .eq('status', 'approved')
      .single()

    if (!check) return Response.json({ ok: true })

    await supabase
      .from('user_referrals')
      .upsert({ user_id: user.id, referred_by: ref_code }, { onConflict: 'user_id' })

    await supabase
      .from('affiliate_clicks')
      .insert({ ref_code, ip_hash: 'signup' })
  }

  // Fetch affiliate
  const { data: affiliate } = await supabase
    .from('affiliates')
    .select('id, total_earnings')
    .eq('ref_code', effectiveRefCode)
    .eq('status', 'approved')
    .single()

  if (!affiliate) return Response.json({ ok: true })

  // If user already has an active subscription, create conversion immediately
  const { data: subscription } = await supabase
    .from('user_subscriptions')
    .select('plan, paddle_subscription_id')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .single()

  if (subscription) {
    await createConversionIfMissing(
      affiliate.id,
      user.id,
      subscription.plan,
      null,
      subscription.paddle_subscription_id
    )
  }

  return Response.json({ ok: true })
}
