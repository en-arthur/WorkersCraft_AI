import { supabase } from '@/lib/supabase'

export async function GET(req, { params }) {
  try {
    const { id } = params

    const { data: conversations, error } = await supabase
      .from('conversations')
      .select('*')
      .eq('project_id', id)
      .order('created_at', { ascending: false })

    if (error) throw error

    return Response.json({ conversations })
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(req, { params }) {
  try {
    const { id } = params
    const { messages } = await req.json()

    if (!messages) {
      return Response.json({ error: 'Messages required' }, { status: 400 })
    }

    const { data: conversation, error } = await supabase
      .from('conversations')
      .insert({
        project_id: id,
        messages
      })
      .select()
      .single()

    if (error) throw error

    return Response.json({ conversation })
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }
}
