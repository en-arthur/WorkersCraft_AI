import { createClient } from '@supabase/supabase-js'
import { createCheckoutUrl } from '@/lib/paddle'

export const dynamic = 'force-dynamic'

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const priceId = searchParams.get('priceId')
    if (!priceId) return Response.json({ error: 'Missing priceId' }, { status: 400 })

    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      { global: { headers: { Authorization: `Bearer ${token}` } } }
    )
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const url = await createCheckoutUrl({
      priceId,
      userId: user.id,
      userEmail: user.email,
    })

    if (!url) return Response.json({ error: 'Failed to create checkout' }, { status: 500 })
    return Response.json({ url })
  } catch (err) {
    console.error('[checkout]', err)
    return Response.json({ error: 'Failed to create checkout' }, { status: 500 })
  }
}
