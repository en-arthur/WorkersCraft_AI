import { supabase } from '@/lib/supabase'

export async function GET(req, { params }) {
  try {
    const { id } = params

    const { data: versions, error } = await supabase
      .from('project_versions')
      .select('*')
      .eq('project_id', id)
      .order('version_number', { ascending: false })

    if (error) throw error

    return Response.json({ versions })
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(req, { params }) {
  try {
    const { id } = params
    const { fragment_data } = await req.json()

    if (!fragment_data) {
      return Response.json({ error: 'Fragment data required' }, { status: 400 })
    }

    // Get current max version
    const { data: maxVersion } = await supabase
      .from('project_versions')
      .select('version_number')
      .eq('project_id', id)
      .order('version_number', { ascending: false })
      .limit(1)

    const nextVersion = (maxVersion?.[0]?.version_number || 0) + 1

    const { data: version, error } = await supabase
      .from('project_versions')
      .insert({
        project_id: id,
        version_number: nextVersion,
        fragment_data
      })
      .select()
      .single()

    if (error) throw error

    // Update project updated_at
    await supabase
      .from('projects')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', id)

    return Response.json({ version })
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }
}
