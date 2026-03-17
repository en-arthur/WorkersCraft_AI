import { validateEvent } from '@polar-sh/sdk/webhooks'
import { handleWebhookPayload } from '@polar-sh/adapter-utils'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const PLAN_MAP = {
  [process.env.NEXT_PUBLIC_POLAR_STARTER_PRODUCT_ID]: 'starter',
  [process.env.NEXT_PUBLIC_POLAR_PRO_PRODUCT_ID]: 'pro',
  [process.env.NEXT_PUBLIC_POLAR_MAX_PRODUCT_ID]: 'max',
}

async function upsertSubscription(sub, status) {
  const userId = sub.customer?.externalId
  if (!userId) return
  const plan = PLAN_MAP[sub.productId] || 'starter'
  await supabase.from('user_subscriptions').upsert({
    user_id: userId,
    polar_customer_id: sub.customerId,
    polar_subscription_id: sub.id,
    plan,
    status,
    current_period_end: sub.currentPeriodEnd,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id' })
}

export async function POST(request) {
  const body = await request.text()
  const signature = request.headers.get('webhook-signature') ?? ''

  let event
  try {
    event = validateEvent(body, request.headers, process.env.POLAR_WEBHOOK_SECRET)
  } catch {
    return new Response('Invalid signature', { status: 403 })
  }

  await handleWebhookPayload(event, {
    webhookSecret: process.env.POLAR_WEBHOOK_SECRET,
    onSubscriptionCreated: async (payload) => upsertSubscription(payload.data, 'active'),
    onSubscriptionUpdated: async (payload) => upsertSubscription(payload.data, payload.data.status === 'active' ? 'active' : payload.data.status),
    onSubscriptionRevoked: async (payload) => upsertSubscription(payload.data, 'inactive'),
  })

  return new Response(null, { status: 200 })
}
