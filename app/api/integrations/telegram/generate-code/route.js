import { createClient } from '@supabase/supabase-js'

function getSupabaseWithAuth(token) {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  )
}

export async function POST(request) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = getSupabaseWithAuth(token)
  
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Generate 6-digit code
  const code = Math.floor(100000 + Math.random() * 900000).toString()
  
  // Store in database
  const { error } = await supabase.from('pending_verifications').insert({
    user_id: user.id,
    verification_code: code,
    integration_type: 'telegram',
    status: 'pending',
    expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(), // 15 minutes
  })

  if (error) {
    console.error('Error creating verification:', error)
    return Response.json({ error: 'Failed to generate code' }, { status: 500 })
  }

  return Response.json({ 
    code,
    bot_username: 'WorkersCraftAiBot',
    bot_url: `https://t.me/WorkersCraftAiBot?start=${code}`,
    expires_in: 900,
  })
}
