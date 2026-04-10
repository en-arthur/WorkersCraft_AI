import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function POST(request) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: { user } } = await supabase.auth.getUser(token)
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { ref_code } = await request.json()
  if (!ref_code) return Response.json({ ok: true })

  // Only save if not already referred
  const { data: existing } = await supabase
    .from('profiles')
    .select('referred_by')
    .eq('id', user.id)
    .single()

  if (existing?.referred_by) return Response.json({ ok: true })

  // Verify affiliate exists and is approved
  const { data: affiliate } = await supabase
    .from('affiliates')
    .select('id, ref_code')
    .eq('ref_code', ref_code)
    .eq('status', 'approved')
    .single()

  if (!affiliate) return Response.json({ ok: true })

  // Save ref_code to user profile
  await supabase
    .from('profiles')
    .upsert({ id: user.id, referred_by: ref_code }, { onConflict: 'id' })

  // Track click as conversion-ready
  await supabase
    .from('affiliate_clicks')
    .insert({ ref_code, ip_hash: 'signup' })

  return Response.json({ ok: true })
}
