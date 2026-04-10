import { kv } from '@vercel/kv'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()

  // Capture affiliate ref code from ?ref= param and store in cookie
  const ref = req.nextUrl.searchParams.get('ref')
  if (ref) {
    res.cookies.set('affiliate_ref', ref, {
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: '/',
      sameSite: 'lax',
    })

    // Track click in background (don't await to avoid slowing down response)
    if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
      )
      
      // Get IP hash for deduplication
      const ip = req.ip || req.headers.get('x-forwarded-for') || 'unknown'
      const ipHash = Buffer.from(ip).toString('base64').slice(0, 16)
      
      supabase
        .from('affiliate_clicks')
        .insert({ ref_code: ref, ip_hash: ipHash })
        .then(() => {})
        .catch(() => {})
    }
  }

  // Handle short URL redirects
  if (req.nextUrl.pathname.startsWith('/s/')) {
    if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
      const id = req.nextUrl.pathname.split('/').pop()
      const url = await kv.get(`fragment:${id}`)
      if (url) return NextResponse.redirect(url as string)
      return NextResponse.redirect(new URL('/', req.url))
    }
    return NextResponse.redirect(new URL('/', req.url))
  }

  return res
}

export const config = {
  matcher: ['/s/:path*', '/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
