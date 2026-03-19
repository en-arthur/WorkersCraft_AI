import crypto from 'crypto'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

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

export async function POST(request) {
  const rawBody = await request.text()
  const signature = request.headers.get('paddle-signature') ?? ''

  if (!verifySignature(rawBody, signature)) {
    console.error('[paddle-webhook] Invalid signature')
    return new Response('Invalid signature', { status: 403 })
  }

  const payload = JSON.parse(rawBody)
  console.log('[paddle-webhook] event_type:', payload.event_type)

  const { event_type, data } = payload

  switch (event_type) {
    case 'subscription.created':
    case 'subscription.activated':
      await upsertSubscription(data, 'active')
      break
    case 'subscription.updated':
      await upsertSubscription(data, data.status === 'active' ? 'active' : data.status)
      break
    case 'subscription.canceled':
      await upsertSubscription(data, 'inactive')
      break
  }

  return new Response(null, { status: 200 })
}
