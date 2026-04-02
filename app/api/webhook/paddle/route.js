import crypto from 'crypto'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const PLAN_MAP = {
  [process.env.PADDLE_STARTER_PRICE_ID]: 'starter',
  [process.env.PADDLE_PRO_PRICE_ID]: 'pro',
  [process.env.PADDLE_MAX_PRICE_ID]: 'max',
}

function verifySignature(rawBody, header) {
  const parts = Object.fromEntries(header.split(';').map(p => p.split('=')))
  const computed = crypto.createHmac('sha256', process.env.PADDLE_WEBHOOK_SECRET)
    .update(`${parts.ts}:${rawBody}`)
    .digest('hex')
  return computed === parts.h1
}

async function upsertSubscription(sub, status) {
  const userId = sub.custom_data?.user_id
  console.log('[paddle-webhook] upsertSubscription userId:', userId, 'status:', status)
  if (!userId) {
    console.error('[paddle-webhook] No user_id in custom_data:', JSON.stringify(sub.custom_data))
    return
  }
  const priceId = sub.items?.[0]?.price?.id
  const plan = PLAN_MAP[priceId] || 'starter'
  console.log('[paddle-webhook] priceId:', priceId, 'plan:', plan)
  const { error } = await supabase.from('user_subscriptions').upsert({
    user_id: userId,
    paddle_customer_id: sub.customer_id,
    paddle_subscription_id: sub.id,
    plan,
    status,
    current_period_end: sub.current_billing_period?.ends_at,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id' })
  if (error) console.error('[paddle-webhook] Supabase upsert error:', error)
}

async function handleTransactionCompleted(txn) {
  const userId = txn.custom_data?.user_id
  if (!userId || !txn.subscription_id) return

  const PADDLE_API_BASE = process.env.NEXT_PUBLIC_PADDLE_ENV === 'production'
    ? 'https://api.paddle.com'
    : 'https://sandbox-api.paddle.com'

  const res = await fetch(`${PADDLE_API_BASE}/subscriptions/${txn.subscription_id}`, {
    headers: { Authorization: `Bearer ${process.env.PADDLE_API_KEY}` },
  })
  if (!res.ok) {
    console.error('[paddle-webhook] Failed to fetch subscription:', txn.subscription_id)
    return
  }
  const { data: sub } = await res.json()
  await upsertSubscription({ ...sub, custom_data: txn.custom_data }, 'active')

  // Track referral with Endorsely
  const referralId = txn.custom_data?.endorsely_referral
  if (referralId && process.env.ENDORSELY_API_SECRET) {
    try {
      const amount = txn.details?.totals?.subtotal
        ? parseInt(txn.details.totals.subtotal)
        : 0
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
      console.log('[endorsely] Referral tracked for referralId:', referralId)
    } catch (err) {
      console.error('[endorsely] Failed to track referral:', err)
    }
  }
}

export async function POST(request) {
  try {
    const rawBody = await request.text()
    const signature = request.headers.get('paddle-signature')

    console.log('[paddle-webhook] Received request, has signature:', !!signature)

    if (!signature) {
      console.error('[paddle-webhook] Missing paddle-signature header')
      return Response.json({ error: 'Missing signature' }, { status: 400 })
    }

    if (!process.env.PADDLE_WEBHOOK_SECRET) {
      console.error('[paddle-webhook] PADDLE_WEBHOOK_SECRET not set')
      return Response.json({ error: 'Webhook not configured' }, { status: 500 })
    }

    if (!verifySignature(rawBody, signature)) {
      console.error('[paddle-webhook] Signature verification failed')
      return Response.json({ error: 'Invalid signature' }, { status: 403 })
    }

    const payload = JSON.parse(rawBody)
    const { event_type, data } = payload
    
    console.log('[paddle-webhook] Event:', event_type, 'user_id:', data?.custom_data?.user_id)

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

    console.log('[paddle-webhook] Successfully processed')
    return Response.json({ received: true }, { status: 200 })
  } catch (error) {
    console.error('[paddle-webhook] Error:', error)
    return Response.json({ error: error.message }, { status: 500 })
  }
}
