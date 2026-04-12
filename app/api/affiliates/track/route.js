import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// Consistent dedup: one conversion per referred_user per affiliate
// Both the webhook and track route use this same function
export async function createConversionIfMissing(affiliateId, userId, plan, amountCents, paddleTransactionId) {
  // Check for existing conversion for this user+affiliate (regardless of transaction ID)
  const { data: existing } = await supabase
    .from('affiliate_conversions')
    .select('id')
    .eq('affiliate_id', affiliateId)
    .eq('referred_user_id', userId)
    .single()

  if (existing) {
    console.log('[conversion] Already exists for user:', userId, 'affiliate:', affiliateId)
    return false
  }

  const PLAN_AMOUNTS = { starter: 3000, pro: 5000, max: 10000 }
  const resolvedAmount = amountCents || PLAN_AMOUNTS[plan?.toLowerCase()] || 0
  const commissionCents = Math.round(resolvedAmount * 0.25)

  const { error } = await supabase.from('affiliate_conversions').insert({
    affiliate_id: affiliateId,
    referred_user_id: userId,
    plan: plan || 'unknown',
    amount_cents: resolvedAmount,
    commission_cents: commissionCents,
    status: 'pending',
    paddle_transaction_id: paddleTransactionId || null,
  })

  if (error) {
    console.error('[conversion] Insert failed:', error)
    return false
  }

  // Atomic increment using rpc to avoid race conditions
  const { error: rpcError } = await supabase.rpc('increment_affiliate_earnings', {
    p_affiliate_id: affiliateId,
    p_amount: commissionCents / 100,
  })

  if (rpcError) {
    // Fallback to read-then-write if rpc doesn't exist yet
    console.warn('[conversion] RPC not available, using fallback:', rpcError.message)
    const { data: aff } = await supabase.from('affiliates').select('total_earnings').eq('id', affiliateId).single()
    await supabase.from('affiliates').update({ total_earnings: (aff?.total_earnings || 0) + (commissionCents / 100) }).eq('id', affiliateId)
  }

  console.log('[conversion] Created — user:', userId, 'plan:', plan, 'commission: $' + (commissionCents / 100).toFixed(2))
  return true
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
  // (handles race condition where webhook fired before referral row existed)
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
      null, // no raw amount here, will use plan-based estimate
      subscription.paddle_subscription_id
    )
  }

  return Response.json({ ok: true })
}
