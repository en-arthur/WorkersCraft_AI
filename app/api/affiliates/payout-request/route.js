import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const MIN_PAYOUT_CENTS = 2000 // $20

// GET - get current payout request status
export async function GET(request) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: { user } } = await supabase.auth.getUser(token)
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: affiliate } = await supabase
    .from('affiliates')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (!affiliate) return Response.json({ request: null })

  const { data: payoutRequest } = await supabase
    .from('payout_requests')
    .select('*')
    .eq('affiliate_id', affiliate.id)
    .order('requested_at', { ascending: false })
    .limit(1)
    .single()

  return Response.json({ request: payoutRequest || null })
}

// POST - submit a payout request
export async function POST(request) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: { user } } = await supabase.auth.getUser(token)
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: affiliate } = await supabase
    .from('affiliates')
    .select('id, total_earnings, total_paid, payout_email')
    .eq('user_id', user.id)
    .eq('status', 'approved')
    .single()

  if (!affiliate) return Response.json({ error: 'Not an approved affiliate' }, { status: 403 })

  // Calculate pending balance
  const { data: conversions } = await supabase
    .from('affiliate_conversions')
    .select('commission_cents')
    .eq('affiliate_id', affiliate.id)
    .eq('status', 'pending')

  const pendingCents = conversions?.reduce((sum, c) => sum + c.commission_cents, 0) || 0

  if (pendingCents < MIN_PAYOUT_CENTS) {
    return Response.json({
      error: `Minimum payout is $${MIN_PAYOUT_CENTS / 100}. Your balance is $${(pendingCents / 100).toFixed(2)}.`
    }, { status: 400 })
  }

  // Block if a pending request already exists
  const { data: existing } = await supabase
    .from('payout_requests')
    .select('id, status')
    .eq('affiliate_id', affiliate.id)
    .eq('status', 'pending')
    .single()

  if (existing) {
    return Response.json({ error: 'You already have a pending payout request.' }, { status: 400 })
  }

  const { data: newRequest, error } = await supabase
    .from('payout_requests')
    .insert({
      affiliate_id: affiliate.id,
      amount_cents: pendingCents,
      status: 'pending',
    })
    .select()
    .single()

  if (error) return Response.json({ error: error.message }, { status: 500 })

  return Response.json({ request: newRequest })
}
