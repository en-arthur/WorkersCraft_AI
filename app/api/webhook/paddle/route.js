import crypto from 'crypto'
import { createClient } from '@supabase/supabase-js'
import { createConversionIfMissing } from '@/lib/affiliate-conversion'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const PLAN_MAP = {
  [process.env.PADDLE_STARTER_PRICE_ID || process.env.NEXT_PUBLIC_PADDLE_STARTER_PRICE_ID]: 'starter',
  [process.env.PADDLE_PRO_PRICE_ID || process.env.NEXT_PUBLIC_PADDLE_PRO_PRICE_ID]: 'pro',
  [process.env.PADDLE_MAX_PRICE_ID || process.env.NEXT_PUBLIC_PADDLE_MAX_PRICE_ID]: 'max',
}

const PADDLE_API_BASE = process.env.NEXT_PUBLIC_PADDLE_ENV === 'production'
  ? 'https://api.paddle.com'
  : 'https://sandbox-api.paddle.com'

function verifySignature(rawBody, header) {
  const parts = Object.fromEntries(header.split(';').map(p => p.split('=')))
  const computed = crypto.createHmac('sha256', process.env.PADDLE_WEBHOOK_SECRET)
    .update(`${parts.ts}:${rawBody}`)
    .digest('hex')
  return computed === parts.h1
}

async function upsertSubscription(sub, status) {
  const userId = sub.custom_data?.user_id
  if (!userId) {
    console.error('[webhook] upsertSubscription: no user_id in custom_data')
    return
  }
  const priceId = sub.items?.[0]?.price?.id
  const plan = PLAN_MAP[priceId] || 'starter'

  const { error } = await supabase.from('user_subscriptions').upsert({
    user_id: userId,
    paddle_customer_id: sub.customer_id,
    paddle_subscription_id: sub.id,
    plan,
    status,
    current_period_end: sub.current_billing_period?.ends_at,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id' })

  if (error) console.error('[webhook] upsertSubscription error:', error)
  else console.log('[webhook] subscription upserted — user:', userId, 'plan:', plan, 'status:', status)
}

async function trackAffiliateConversion(txn, planName) {
  const userId = txn.custom_data?.user_id
  if (!userId) return

  const { data: referral } = await supabase
    .from('user_referrals')
    .select('referred_by')
    .eq('user_id', userId)
    .single()

  if (!referral?.referred_by) {
    console.log('[affiliate] No referral found for user:', userId)
    return
  }

  const { data: affiliate } = await supabase
    .from('affiliates')
    .select('id, total_earnings')
    .eq('ref_code', referral.referred_by)
    .eq('status', 'approved')
    .single()

  if (!affiliate) {
    console.log('[affiliate] Affiliate not found or not approved:', referral.referred_by)
    return
  }

  const amountCents = txn.details?.totals?.subtotal ? parseInt(txn.details.totals.subtotal) : 0

  await createConversionIfMissing(
    affiliate.id,
    userId,
    planName,
    amountCents,
    txn.id
  )
}

async function handleTransactionCompleted(txn) {
  const userId = txn.custom_data?.user_id
  if (!userId) {
    console.error('[webhook] transaction.completed: no user_id in custom_data')
    return
  }

  let planName = 'unknown'

  // Fetch and upsert subscription if present
  if (txn.subscription_id) {
    try {
      const res = await fetch(`${PADDLE_API_BASE}/subscriptions/${txn.subscription_id}`, {
        headers: { Authorization: `Bearer ${process.env.PADDLE_API_KEY}` },
      })
      if (res.ok) {
        const { data: sub } = await res.json()
        await upsertSubscription({ ...sub, custom_data: txn.custom_data }, 'active')
        // Resolve plan name from the fetched subscription
        const priceId = sub.items?.[0]?.price?.id
        planName = PLAN_MAP[priceId] || sub.items?.[0]?.price?.name || 'unknown'
      } else {
        console.error('[webhook] Failed to fetch subscription:', txn.subscription_id, res.status)
      }
    } catch (err) {
      console.error('[webhook] Error fetching subscription:', err)
    }
  } else {
    // No subscription_id — derive plan from transaction items directly
    const priceId = txn.items?.[0]?.price?.id
    planName = PLAN_MAP[priceId] || txn.items?.[0]?.price?.name || 'unknown'
  }

  // Track affiliate conversion — always runs regardless of subscription fetch outcome
  try {
    await trackAffiliateConversion(txn, planName)
  } catch (err) {
    console.error('[affiliate] Unexpected error in trackAffiliateConversion:', err)
  }

  // Track with Endorsely
  const referralId = txn.custom_data?.endorsely_referral
  if (referralId && process.env.ENDORSELY_API_SECRET) {
    try {
      const amount = txn.details?.totals?.subtotal ? parseInt(txn.details.totals.subtotal) : 0
      await fetch('https://app.endorsely.com/api/public/refer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.ENDORSELY_API_SECRET}`,
        },
        body: JSON.stringify({
          referralId,
          organizationId: '2e4c7866-d841-48a8-8128-32eb3ae6090d',
          email: txn.customer?.email,
          amount,
          customerId: userId,
        }),
      })
    } catch (err) {
      console.error('[endorsely] Failed to track referral:', err)
    }
  }
}

export async function POST(request) {
  try {
    const rawBody = await request.text()
    const signature = request.headers.get('paddle-signature')

    if (!signature) return Response.json({ error: 'Missing signature' }, { status: 400 })
    if (!process.env.PADDLE_WEBHOOK_SECRET) return Response.json({ error: 'Webhook not configured' }, { status: 500 })
    if (!verifySignature(rawBody, signature)) return Response.json({ error: 'Invalid signature' }, { status: 403 })

    const { event_type, data } = JSON.parse(rawBody)
    console.log('[webhook] event:', event_type, '| user_id:', data?.custom_data?.user_id)

    switch (event_type) {
      case 'subscription.created':
      case 'subscription.activated':
        await upsertSubscription(data, 'active')
        break
      case 'subscription.updated':
        await upsertSubscription(data, data.status === 'active' ? 'active' : data.status)
        break
      case 'subscription.paused':
        await upsertSubscription(data, 'paused')
        break
      case 'subscription.resumed':
        await upsertSubscription(data, 'active')
        break
      case 'subscription.canceled':
        await upsertSubscription(data, 'inactive')
        break
      case 'transaction.completed':
        await handleTransactionCompleted(data)
        break
      case 'transaction.payment_failed': {
        const userId = data.custom_data?.user_id
        if (userId) {
          await supabase.from('user_subscriptions')
            .update({ payment_failed_at: new Date().toISOString(), updated_at: new Date().toISOString() })
            .eq('user_id', userId)
        }
        break
      }
    }

    return Response.json({ received: true }, { status: 200 })
  } catch (error) {
    console.error('[webhook] Unhandled error:', error)
    return Response.json({ error: error.message }, { status: 500 })
  }
}
