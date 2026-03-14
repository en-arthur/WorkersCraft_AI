import { createClient } from '@supabase/supabase-js'

function getSupabaseWithAuth(token) {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  )
}

function getAuth(request) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return { error: 'Unauthorized' }
  return { token, supabase: getSupabaseWithAuth(token) }
}

export async function GET(request, { params }) {
  const { supabase, error } = getAuth(request)
  if (error) return Response.json({ error }, { status: 401 })

  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = params

  const { data: project, error: dbError } = await supabase
    .from('projects')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (dbError || !project) return Response.json({ error: 'Project not found' }, { status: 404 })

  const { data: latestVersion } = await supabase
    .from('project_versions')
    .select('fragment_data, version_number')
    .eq('project_id', id)
    .order('version_number', { ascending: false })
    .limit(1)
    .single()

  const { data: conversation } = await supabase
    .from('conversations')
    .select('messages')
    .eq('project_id', id)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  return Response.json({ project, latest_version: latestVersion ?? null, conversation: conversation ?? null })
}

export async function PATCH(request, { params }) {
  const { supabase, error } = getAuth(request)
  if (error) return Response.json({ error }, { status: 401 })

  const { data: { user: u1 }, error: e1 } = await supabase.auth.getUser()
  if (e1 || !u1) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = params
  const body = await request.json()

  const { error: dbError } = await supabase
    .from('projects')
    .update(body)
    .eq('id', id)
    .eq('user_id', u1.id)

  if (dbError) return Response.json({ error: dbError.message }, { status: 500 })

  return Response.json({ success: true })
}

export async function DELETE(request, { params }) {
  const { supabase, error } = getAuth(request)
  if (error) return Response.json({ error }, { status: 401 })

  const { data: { user: u2 }, error: e2 } = await supabase.auth.getUser()
  if (e2 || !u2) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = params

  const { error: dbError } = await supabase
    .from('projects')
    .delete()
    .eq('id', id)
    .eq('user_id', u2.id)

  if (dbError) return Response.json({ error: dbError.message }, { status: 500 })

  return Response.json({ success: true })
}
