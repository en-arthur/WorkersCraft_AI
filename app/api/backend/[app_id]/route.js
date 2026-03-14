import { createClient } from '@supabase/supabase-js'

const CLOUDSERVICE_URL = process.env.NEXT_PUBLIC_CLOUDSERVICE_URL || 'https://cloud.workerscraft.com'

function getSupabaseWithAuth(token) {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  )
}

async function getAdminToken(appId, ownerId) {
  const res = await fetch(`${CLOUDSERVICE_URL}/api/admin/apps/${appId}/token?owner_id=${ownerId}`, {
    method: 'POST',
  })
  if (!res.ok) throw new Error('Failed to get admin token')
  const { admin_token } = await res.json()
  return admin_token
}

async function verifyOwner(supabase, appId) {
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return null

  const { data: project } = await supabase
    .from('projects')
    .select('id')
    .eq('backend_app_id', appId)
    .eq('user_id', user.id)
    .single()

  if (!project) return null
  return user
}

export async function GET(request, { params }) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = getSupabaseWithAuth(token)
  const { app_id } = params
  const user = await verifyOwner(supabase, app_id)
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const adminToken = await getAdminToken(app_id, user.id)
  const { searchParams } = new URL(request.url)
  const resource = searchParams.get('resource') || 'users'
  const collection = searchParams.get('collection') || ''

  const url = resource === 'storage'
    ? `${CLOUDSERVICE_URL}/api/admin/apps/${app_id}/storage${collection ? `?collection=${collection}` : ''}`
    : `${CLOUDSERVICE_URL}/api/admin/apps/${app_id}/users`

  const res = await fetch(url, { headers: { Authorization: `Bearer ${adminToken}` } })
  const data = await res.json()
  return Response.json(data, { status: res.status })
}

export async function DELETE(request, { params }) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = getSupabaseWithAuth(token)
  const { app_id } = params
  const user = await verifyOwner(supabase, app_id)
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const adminToken = await getAdminToken(app_id, user.id)
  const { searchParams } = new URL(request.url)
  const resource = searchParams.get('resource')
  const recordId = searchParams.get('record_id')

  const res = await fetch(`${CLOUDSERVICE_URL}/api/admin/apps/${app_id}/${resource}/${recordId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${adminToken}` }
  })

  return Response.json({ success: res.ok }, { status: res.status })
}
