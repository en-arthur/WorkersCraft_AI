import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function isAdmin(credentials) {
  // Simple hardcoded admin check
  const adminUsername = process.env.ADMIN_USERNAME || 'admin'
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin123'
  
  return credentials?.username === adminUsername && credentials?.password === adminPassword
}

// GET - list all affiliates (admin only)
export async function GET(request) {
  const authHeader = request.headers.get('authorization')
  if (!authHeader) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  
  // Expect "Basic base64(username:password)"
  const [type, encoded] = authHeader.split(' ')
  if (type !== 'Basic') return Response.json({ error: 'Invalid auth type' }, { status: 401 })
  
  const decoded = Buffer.from(encoded, 'base64').toString()
  const [username, password] = decoded.split(':')
  
  const adminCheck = await isAdmin({ username, password })
  if (!adminCheck) return Response.json({ error: 'Forbidden' }, { status: 403 })

  const { data: affiliates, error } = await supabase
    .from('affiliates')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching affiliates:', error)
    return Response.json({ error: error.message }, { status: 500 })
  }

  // Get user emails from auth.users
  const userIds = affiliates?.map(a => a.user_id) || []
  const { data: users } = await supabase.auth.admin.listUsers()
  const userMap = {}
  users?.users?.forEach(u => { userMap[u.id] = u.email })

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
      email: userMap[a.user_id] || a.payout_email,
      clicks: clicks || 0,
      conversions: conversions?.length || 0,
      pending_earnings: conversions?.filter(c => c.status === 'pending').reduce((s, c) => s + c.commission_cents / 100, 0) || 0,
    }
  }))

  return Response.json({ affiliates: enriched })
}

// PATCH - approve/reject affiliate or mark conversion paid (admin only)
export async function PATCH(request) {
  const authHeader = request.headers.get('authorization')
  if (!authHeader) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  
  const [type, encoded] = authHeader.split(' ')
  if (type !== 'Basic') return Response.json({ error: 'Invalid auth type' }, { status: 401 })
  
  const decoded = Buffer.from(encoded, 'base64').toString()
  const [username, password] = decoded.split(':')
  
  const adminCheck = await isAdmin({ username, password })
  if (!adminCheck) return Response.json({ error: 'Forbidden' }, { status: 403 })

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
