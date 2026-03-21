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

    console.log('[conversations POST] projectId:', id, 'messages count:', messages.length)

    // Check if a conversation already exists for this project
    const { data: existing } = await supabase
      .from('conversations')
      .select('id')
      .eq('project_id', id)
      .single()

    console.log('[conversations POST] existing conversation:', existing?.id)

    let error
    if (existing?.id) {
      // Update existing row
      console.log('[conversations POST] Updating existing conversation')
      const { error: updateError } = await supabase
        .from('conversations')
        .update({ messages })
        .eq('id', existing.id)
      error = updateError
      if (updateError) console.error('[conversations POST] Update error:', updateError)
    } else {
      // Insert new row
      console.log('[conversations POST] Inserting new conversation')
      const { error: insertError } = await supabase
        .from('conversations')
        .insert({ project_id: id, messages })
      error = insertError
      if (insertError) console.error('[conversations POST] Insert error:', insertError)
    }

    if (error) throw error

    console.log('[conversations POST] Success')
    return Response.json({ ok: true })
  } catch (error) {
    console.error('[conversations POST] Error:', error)
    return Response.json({ error: error.message }, { status: 500 })
  }
}
