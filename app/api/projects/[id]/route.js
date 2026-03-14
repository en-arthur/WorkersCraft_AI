import { createClient } from '@supabase/supabase-js'

function getSupabaseWithAuth(token) {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  )
}

export async function PATCH(request, { params }) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = getSupabaseWithAuth(token)
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = params
  const body = await request.json()

  const { error } = await supabase
    .from('projects')
    .update(body)
    .eq('id', id)
    .eq('user_id', session.user.id)

  if (error) return Response.json({ error: error.message }, { status: 500 })

  return Response.json({ success: true })
}
