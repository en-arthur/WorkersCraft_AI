import { polar } from '@/lib/polar'
import { createClient } from '@supabase/supabase-js'

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

    // Find or create Polar customer by external ID
    const customers = await polar.customers.list({ externalCustomerId: user.id })
    const customer = customers.result?.items?.[0]
    if (!customer) return Response.json({ error: 'No subscription found' }, { status: 404 })

    const portal = await polar.customerSessions.create({ customerId: customer.id })
    return Response.json({ url: portal.customerPortalUrl })
  } catch (err) {
    console.error('[customer-portal]', err)
    return Response.json({ error: 'Failed to create portal session' }, { status: 500 })
  }
}
