import { Webhooks } from '@polar-sh/nextjs'
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

export const POST = Webhooks({
  webhookSecret: process.env.POLAR_WEBHOOK_SECRET,
  onSubscriptionCreated: async (sub) => upsertSubscription(sub, 'active'),
  onSubscriptionUpdated: async (sub) => upsertSubscription(sub, sub.status === 'active' ? 'active' : sub.status),
  onSubscriptionRevoked: async (sub) => upsertSubscription(sub, 'inactive'),
})
