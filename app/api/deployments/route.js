import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function GET(request) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')
    const status = searchParams.get('status')
    const projectId = searchParams.get('project_id')

    let query = supabase
      .from('deployments')
      .select(`
        *,
        projects (
          id,
          name,
          platform
        )
      `)
      .eq('user_id', user.id)
      .not('project_id', 'is', null)
      .order('created_at', { ascending: false })

    if (type) query = query.eq('type', type)
    if (status) query = query.eq('status', status)
    if (projectId) query = query.eq('project_id', projectId)

    const { data, error } = await query

    if (error) throw error

    return Response.json({ deployments: data || [] })
  } catch (error) {
    console.error('Error fetching deployments:', error)
    return Response.json({ error: 'Failed to fetch deployments' }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { project_id, type, platform, build_type, commit_sha, branch } = body

    const { data, error } = await supabase
      .from('deployments')
      .insert({
        project_id,
        user_id: user.id,
        type,
        platform,
        build_type,
        commit_sha,
        branch,
        status: 'pending'
      })
      .select()
      .single()

    if (error) throw error

    return Response.json({ deployment: data })
  } catch (error) {
    console.error('Error creating deployment:', error)
    return Response.json({ error: 'Failed to create deployment' }, { status: 500 })
  }
}
