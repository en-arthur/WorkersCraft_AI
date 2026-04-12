import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function createConversionIfMissing(affiliateId, totalEarnings, userId, subscriptionPlan, paddleSubId) {
  const { data: existingConversion } = await supabase
    .from('affiliate_conversions')
    .select('id')
    .eq('affiliate_id', affiliateId)
    .eq('referred_user_id', userId)
    .single()

  if (existingConversion) return // already recorded

  const PLAN_AMOUNTS = { starter: 3000, pro: 5000, max: 10000 }
  const amountCents = PLAN_AMOUNTS[subscriptionPlan] || 0
  const commissionCents = Math.round(amountCents * 0.25)

  const { error } = await supabase.from('affiliate_conversions').insert({
    affiliate_id: affiliateId,
    referred_user_id: userId,
    plan: subscriptionPlan,
    amount_cents: amountCents,
    commission_cents: commissionCents,
    status: 'pending',
    paddle_transaction_id: paddleSubId || null,
  })

  if (!error) {
    await supabase
      .from('affiliates')
      .update({ total_earnings: (totalEarnings || 0) + (commissionCents / 100) })
      .eq('id', affiliateId)
    console.log('[track] Conversion created for user:', userId, 'plan:', subscriptionPlan)
  } else {
    console.error('[track] Failed to insert conversion:', error)
  }
}

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
    // First time — verify affiliate and save referral
    const { data: affiliate } = await supabase
      .from('affiliates')
      .select('id')
      .eq('ref_code', ref_code)
      .eq('status', 'approved')
      .single()

    if (!affiliate) return Response.json({ ok: true })

    await supabase
      .from('user_referrals')
      .upsert({ user_id: user.id, referred_by: ref_code }, { onConflict: 'user_id' })

    await supabase
      .from('affiliate_clicks')
      .insert({ ref_code, ip_hash: 'signup' })
  }

  // Always check if a conversion is missing for an active subscriber
  // This handles: race condition (webhook fired before referral saved)
  // and: already-referred users who subscribed but conversion was never recorded
  const { data: affiliate } = await supabase
    .from('affiliates')
    .select('id, total_earnings')
    .eq('ref_code', effectiveRefCode)
    .eq('status', 'approved')
    .single()

  if (!affiliate) return Response.json({ ok: true })

  const { data: subscription } = await supabase
    .from('user_subscriptions')
    .select('plan, paddle_subscription_id')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .single()

  if (subscription) {
    await createConversionIfMissing(
      affiliate.id,
      affiliate.total_earnings,
      user.id,
      subscription.plan,
      subscription.paddle_subscription_id
    )
  }

  return Response.json({ ok: true })
}
