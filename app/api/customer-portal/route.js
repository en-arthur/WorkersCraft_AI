import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

async function getCustomerPortalUrl(customerId, subscriptionId) {
  // Production is default, only use sandbox if explicitly set
  const PADDLE_API_BASE = process.env.PADDLE_ENV === 'sandbox'
    ? 'https://sandbox-api.paddle.com'
    : 'https://api.paddle.com'

  const body = subscriptionId ? { subscription_ids: [subscriptionId] } : {}
  
  const res = await fetch(`${PADDLE_API_BASE}/customers/${customerId}/portal-sessions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.PADDLE_API_KEY}`,
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Paddle API error ${res.status}: ${text}`)
  }

  const data = await res.json()
  return data?.data?.urls?.general?.overview ?? null
}

export async function GET(request) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      { global: { headers: { Authorization: `Bearer ${token}` } } }
    )
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: sub, error: subError } = await supabase
      .from('user_subscriptions')
      .select('paddle_customer_id, paddle_subscription_id, status')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single()

    console.log('[customer-portal] Subscription data:', sub, 'Error:', subError)

    if (!sub?.paddle_customer_id) {
      return Response.json({ error: 'No active subscription found' }, { status: 404 })
    }

    const url = await getCustomerPortalUrl(sub.paddle_customer_id, sub.paddle_subscription_id)
    console.log('[customer-portal] Portal URL:', url)
    
    if (!url) {
      return Response.json({ error: 'Failed to generate portal URL' }, { status: 500 })
    }
    
    return Response.json({ url })
  } catch (err) {
    console.error('[customer-portal] Error:', err)
    return Response.json({ error: err.message || 'Failed to create portal session' }, { status: 500 })
  }
}
