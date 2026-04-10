import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// GET - get current user's affiliate info + stats
export async function GET(request) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: { user } } = await supabase.auth.getUser(token)
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: affiliate } = await supabase
    .from('affiliates')
    .select('*')
    .eq('user_id', user.id)
    .single()

  if (!affiliate) return Response.json({ affiliate: null })

  // Get stats
  const { count: clicks } = await supabase
    .from('affiliate_clicks')
    .select('*', { count: 'exact', head: true })
    .eq('ref_code', affiliate.ref_code)

  const { data: conversions } = await supabase
    .from('affiliate_conversions')
    .select('*')
    .eq('affiliate_id', affiliate.id)

  return Response.json({
    affiliate,
    stats: {
      clicks: clicks || 0,
      conversions: conversions?.length || 0,
      pending_earnings: conversions?.filter(c => c.status === 'pending').reduce((sum, c) => sum + (c.commission_cents / 100), 0) || 0,
      paid_earnings: conversions?.filter(c => c.status === 'paid').reduce((sum, c) => sum + (c.commission_cents / 100), 0) || 0,
    },
    conversions: conversions || []
  })
}

// POST - apply to affiliate program
export async function POST(request) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: { user } } = await supabase.auth.getUser(token)
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { payout_email, how_promote } = await request.json()
  if (!payout_email || !how_promote) return Response.json({ error: 'Missing fields' }, { status: 400 })

  // Check if already applied
  const { data: existing } = await supabase
    .from('affiliates')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (existing) return Response.json({ error: 'Already applied' }, { status: 400 })

  // Generate unique ref code from email username
  const baseCode = user.email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '')
  let ref_code = baseCode
  let suffix = 1
  while (true) {
    const { data: taken } = await supabase.from('affiliates').select('id').eq('ref_code', ref_code).single()
    if (!taken) break
    ref_code = `${baseCode}${suffix++}`
  }

  const { data, error } = await supabase
    .from('affiliates')
    .insert({ user_id: user.id, ref_code, payout_email, how_promote, status: 'pending' })
    .select()
    .single()

  if (error) return Response.json({ error: error.message }, { status: 500 })

  return Response.json({ affiliate: data })
}
