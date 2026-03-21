import { supabase } from '@/lib/supabase'
import { createClient } from '@supabase/supabase-js'

function getSupabaseWithAuth(token) {
  if (!token) return null
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      global: {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    }
  )
}

export async function GET(req, { params }) {
  try {
    const token = req.headers.get('authorization')?.replace('Bearer ', '')
    
    if (!token) {
      return Response.json({ error: 'Authorization required' }, { status: 401 })
    }

    const supabase = getSupabaseWithAuth(token)
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
    const token = req.headers.get('authorization')?.replace('Bearer ', '')
    
    if (!token) {
      return Response.json({ error: 'Authorization required' }, { status: 401 })
    }

    const supabase = getSupabaseWithAuth(token)
    const { id } = params
    const { messages } = await req.json()

    if (!messages) {
      return Response.json({ error: 'Messages required' }, { status: 400 })
    }

    const { data: conversation, error } = await supabase
      .from('conversations')
      .upsert(
        { project_id: id, messages },
        { onConflict: 'project_id' }
      )
      .select()
      .single()

    if (error) throw error

    return Response.json({ conversation })
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }
}
