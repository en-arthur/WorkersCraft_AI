import { supabase } from '@/lib/supabase'
import { createClient } from '@supabase/supabase-js'
import { getUserPlan } from '@/lib/entitlements'

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

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url)
    const user_id = searchParams.get('user_id')
    const token = req.headers.get('authorization')?.replace('Bearer ', '')

    if (!user_id) {
      return Response.json({ error: 'User ID required' }, { status: 400 })
    }

    if (!token) {
      return Response.json({ error: 'Authorization required' }, { status: 401 })
    }

    const supabaseAuth = getSupabaseWithAuth(token)
    if (!supabaseAuth) {
      return Response.json({ error: 'Failed to create auth client' }, { status: 500 })
    }

    const { data: projects, error } = await supabaseAuth
      .from('projects')
      .select('*')
      .eq('user_id', user_id)
      .eq('is_archived', false)
      .order('updated_at', { ascending: false })

    if (error) {
      console.error('Error fetching projects:', error)
      throw error
    }

    return Response.json({ projects })
  } catch (error) {
    console.error('Error in GET /api/projects:', error)
    return Response.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(req) {
  try {
    const token = req.headers.get('authorization')?.replace('Bearer ', '')
    
    if (!token) {
      return Response.json({ error: 'Authorization required' }, { status: 401 })
    }

    const supabaseAuth = getSupabaseWithAuth(token)
    if (!supabaseAuth) {
      return Response.json({ error: 'Failed to create auth client' }, { status: 500 })
    }

    const { user_id, name, description, user_prompt, platform, tech_stack, backend_enabled, fragment_data } = await req.json()

    console.log('Creating project:', { user_id, name, description, user_prompt, platform, tech_stack, backend_enabled })

    if (!user_id || !name) {
      return Response.json({ error: 'User ID and name required' }, { status: 400 })
    }

    // Subscription gate
    const plan = await getUserPlan(user_id)
    if (!plan) {
      return Response.json({ error: 'subscription_required' }, { status: 402 })
    }

    const { data: project, error } = await supabaseAuth
      .from('projects')
      .insert({
        user_id,
        name,
        description,
        user_prompt,
        platform: platform || 'web',
        tech_stack: tech_stack || 'nextjs-developer',
        backend_enabled: backend_enabled || false,
        backend_status: backend_enabled ? 'pending' : 'inactive',
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) {
      console.error('Supabase error creating project:', error)
      throw error
    }

    console.log('Project created:', project)

    // Save initial version
    if (fragment_data) {
      const { error: versionError } = await supabaseAuth
        .from('project_versions')
        .insert({
          project_id: project.id,
          version_number: 1,
          fragment_data
        })
      
      if (versionError) {
        console.error('Error creating version:', versionError)
      }
    }

    return Response.json({ project })
  } catch (error) {
    console.error('Error in POST /api/projects:', error)
    return Response.json({ 
      error: error.message || 'Internal server error',
      details: error.toString()
    }, { status: 500 })
  }
}
