import { supabase } from '@/lib/supabase'

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url)
    const user_id = searchParams.get('user_id')

    if (!user_id) {
      return Response.json({ error: 'User ID required' }, { status: 400 })
    }

    const { data: projects, error } = await supabase
      .from('projects')
      .select('*')
      .eq('user_id', user_id)
      .eq('is_archived', false)
      .order('updated_at', { ascending: false })

    if (error) throw error

    return Response.json({ projects })
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(req) {
  try {
    const { user_id, name, description, fragment_data } = await req.json()

    if (!user_id || !name) {
      return Response.json({ error: 'User ID and name required' }, { status: 400 })
    }

    const { data: project, error } = await supabase
      .from('projects')
      .insert({
        user_id,
        name,
        description,
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) throw error

    // Save initial version
    if (fragment_data) {
      await supabase
        .from('project_versions')
        .insert({
          project_id: project.id,
          version_number: 1,
          fragment_data
        })
    }

    return Response.json({ project })
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }
}
