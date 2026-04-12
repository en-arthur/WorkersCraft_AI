import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const PLAN_AMOUNTS = { starter: 3000, pro: 5000, max: 10000 }

export async function createConversionIfMissing(affiliateId, userId, plan, amountCents, paddleTransactionId) {
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

  // Atomic increment via RPC, fallback to read-then-write
  const { error: rpcError } = await supabase.rpc('increment_affiliate_earnings', {
    p_affiliate_id: affiliateId,
    p_amount: commissionCents / 100,
  })

  if (rpcError) {
    const { data: aff } = await supabase.from('affiliates').select('total_earnings').eq('id', affiliateId).single()
    await supabase.from('affiliates').update({ total_earnings: (aff?.total_earnings || 0) + (commissionCents / 100) }).eq('id', affiliateId)
  }

  console.log('[conversion] Created — user:', userId, 'plan:', plan, 'commission: $' + (commissionCents / 100).toFixed(2))
  return true
}
