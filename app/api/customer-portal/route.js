import { createClient } from '@supabase/supabase-js'
import { getCustomerPortalUrl } from '@/lib/paddle'

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

    const { data: sub } = await supabase
      .from('user_subscriptions')
      .select('paddle_customer_id')
      .eq('user_id', user.id)
      .single()

    if (!sub?.paddle_customer_id) return Response.json({ error: 'No subscription found' }, { status: 404 })

    const url = await getCustomerPortalUrl(sub.paddle_customer_id)
    return Response.json({ url })
  } catch (err) {
    console.error('[customer-portal]', err)
    return Response.json({ error: 'Failed to create portal session' }, { status: 500 })
  }
}
