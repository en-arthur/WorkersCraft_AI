import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function GET(request, { params }) {
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

    const { data, error } = await supabase
      .from('deployments')
      .select(`
        *,
        projects (
          id,
          name,
          platform,
          github_repo_url
        )
      `)
      .eq('id', params.id)
      .eq('user_id', user.id)
      .single()

    if (error) throw error

    return Response.json({ deployment: data })
  } catch (error) {
    console.error('Error fetching deployment:', error)
    return Response.json({ error: 'Failed to fetch deployment' }, { status: 500 })
  }
}

export async function PATCH(request, { params }) {
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

    const { data, error } = await supabase
      .from('deployments')
      .update(body)
      .eq('id', params.id)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) throw error

    return Response.json({ deployment: data })
  } catch (error) {
    console.error('Error updating deployment:', error)
    return Response.json({ error: 'Failed to update deployment' }, { status: 500 })
  }
}
