import { kv } from '@vercel/kv'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

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
