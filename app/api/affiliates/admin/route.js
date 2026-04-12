import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

function parseBasicAuth(request) {
  const authHeader = request.headers.get('authorization')
  if (!authHeader) return null
  const [type, encoded] = authHeader.split(' ')
  if (type !== 'Basic') return null
  const decoded = Buffer.from(encoded, 'base64').toString()
  const colonIdx = decoded.indexOf(':')
  return { username: decoded.slice(0, colonIdx), password: decoded.slice(colonIdx + 1) }
}

function isAdmin(creds) {
  return (
    creds?.username === (process.env.ADMIN_USERNAME || 'admin') &&
    creds?.password === (process.env.ADMIN_PASSWORD || 'admin123')
  )
}

export async function GET(request) {
  const creds = parseBasicAuth(request)
  if (!isAdmin(creds)) return Response.json({ error: 'Forbidden' }, { status: 403 })

  const { data: affiliates } = await supabase
    .from('affiliates')
    .select('*')
    .order('created_at', { ascending: false })

  const { data: { users } } = await supabase.auth.admin.listUsers()
  const userMap = {}
  users?.forEach(u => { userMap[u.id] = u.email })

  const enriched = await Promise.all((affiliates || []).map(async (a) => {
    const { count: clicks } = await supabase
      .from('affiliate_clicks')
      .select('*', { count: 'exact', head: true })
      .eq('ref_code', a.ref_code)

    const { data: conversions } = await supabase
      .from('affiliate_conversions')
      .select('commission_cents, status')
      .eq('affiliate_id', a.id)

    const { data: payoutRequests } = await supabase
      .from('payout_requests')
      .select('*')
      .eq('affiliate_id', a.id)
      .order('requested_at', { ascending: false })

    return {
      ...a,
      email: userMap[a.user_id] || a.payout_email,
      clicks: clicks || 0,
      conversions: conversions?.length || 0,
      pending_earnings: conversions?.filter(c => c.status === 'pending').reduce((s, c) => s + c.commission_cents / 100, 0) || 0,
      payout_requests: payoutRequests || [],
    }
  }))

  return Response.json({ affiliates: enriched })
}

export async function PATCH(request) {
  const creds = parseBasicAuth(request)
  if (!isAdmin(creds)) return Response.json({ error: 'Forbidden' }, { status: 403 })

  const body = await request.json()
  const { affiliate_id, status, payout_request_id, payout_action, notes } = body

  // Approve/reject affiliate
  if (affiliate_id && status) {
    await supabase
      .from('affiliates')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', affiliate_id)
    return Response.json({ success: true })
  }

  // Handle payout request action: approve | reject | paid
  if (payout_request_id && payout_action) {
    if (!['approved', 'rejected', 'paid'].includes(payout_action)) {
      return Response.json({ error: 'Invalid payout_action' }, { status: 400 })
    }

    const { data: pr } = await supabase
      .from('payout_requests')
      .select('*, affiliates(id, total_paid)')
      .eq('id', payout_request_id)
      .single()

    if (!pr) return Response.json({ error: 'Payout request not found' }, { status: 404 })

    await supabase
      .from('payout_requests')
      .update({
        status: payout_action,
        notes: notes || null,
        resolved_at: new Date().toISOString(),
      })
      .eq('id', payout_request_id)

    // On paid: mark all pending conversions as paid + update total_paid
    if (payout_action === 'paid') {
      await supabase
        .from('affiliate_conversions')
        .update({ status: 'paid', paid_at: new Date().toISOString() })
        .eq('affiliate_id', pr.affiliate_id)
        .eq('status', 'pending')

      const currentPaid = pr.affiliates?.total_paid || 0
      await supabase
        .from('affiliates')
        .update({ total_paid: currentPaid + (pr.amount_cents / 100) })
        .eq('id', pr.affiliate_id)
    }

    return Response.json({ success: true })
  }

  return Response.json({ error: 'Invalid request' }, { status: 400 })
}
