import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

function isAdmin(user) {
  return user.email === process.env.ADMIN_EMAIL
}

// GET - list all affiliates (admin only)
export async function GET(request) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: { user } } = await supabase.auth.getUser(token)
  if (!user || !isAdmin(user)) return Response.json({ error: 'Forbidden' }, { status: 403 })

  const { data: affiliates } = await supabase
    .from('affiliates')
    .select(`*, profiles(full_name, email:id)`)
    .order('created_at', { ascending: false })

  // Get clicks and conversions for each
  const enriched = await Promise.all((affiliates || []).map(async (a) => {
    const { count: clicks } = await supabase
      .from('affiliate_clicks')
      .select('*', { count: 'exact', head: true })
      .eq('ref_code', a.ref_code)

    const { data: conversions } = await supabase
      .from('affiliate_conversions')
      .select('commission_cents, status')
      .eq('affiliate_id', a.id)

    return {
      ...a,
      clicks: clicks || 0,
      conversions: conversions?.length || 0,
      pending_earnings: conversions?.filter(c => c.status === 'pending').reduce((s, c) => s + c.commission_cents / 100, 0) || 0,
    }
  }))

  return Response.json({ affiliates: enriched })
}

// PATCH - approve/reject affiliate or mark conversion paid (admin only)
export async function PATCH(request) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: { user } } = await supabase.auth.getUser(token)
  if (!user || !isAdmin(user)) return Response.json({ error: 'Forbidden' }, { status: 403 })

  const { affiliate_id, status, conversion_id, mark_paid } = await request.json()

  if (conversion_id && mark_paid) {
    const { data: conv } = await supabase
      .from('affiliate_conversions')
      .update({ status: 'paid', paid_at: new Date().toISOString() })
      .eq('id', conversion_id)
      .select()
      .single()

    // Update affiliate total_paid
    await supabase.rpc('increment_affiliate_paid', {
      aff_id: conv.affiliate_id,
      amount: conv.commission_cents / 100
    })

    return Response.json({ success: true })
  }

  if (affiliate_id && status) {
    await supabase
      .from('affiliates')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', affiliate_id)

    return Response.json({ success: true })
  }

  return Response.json({ error: 'Invalid request' }, { status: 400 })
}
