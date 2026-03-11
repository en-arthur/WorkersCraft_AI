import { supabase } from '@/lib/supabase'

export async function GET(req, { params }) {
  try {
    const { id } = params

    const { data: project, error } = await supabase
      .from('projects')
      .select('*')
      .eq('id', id)
      .single()

    if (error) throw error

    // Get latest version
    const { data: versions } = await supabase
      .from('project_versions')
      .select('*')
      .eq('project_id', id)
      .order('version_number', { ascending: false })
      .limit(1)

    // Get conversations
    const { data: conversations } = await supabase
      .from('conversations')
      .select('*')
      .eq('project_id', id)
      .order('created_at', { ascending: false })

    return Response.json({
      project,
      latest_version: versions?.[0] || null,
      conversations: conversations || []
    })
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }
}

export async function PUT(req, { params }) {
  try {
    const { id } = params
    const { name, description } = await req.json()

    const { data: project, error } = await supabase
      .from('projects')
      .update({
        name,
        description,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    return Response.json({ project })
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(req, { params }) {
  try {
    const { id } = params

    const { error } = await supabase
      .from('projects')
      .update({ is_archived: true })
      .eq('id', id)

    if (error) throw error

    return Response.json({ success: true })
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }
}
