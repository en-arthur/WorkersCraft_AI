import { redirect } from 'next/navigation'

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const supabaseToken = searchParams.get('token')

  const params = new URLSearchParams({
    client_id: process.env.GITHUB_CLIENT_ID,
    redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/github/callback`,
    scope: 'repo workflow read:user user:email',
    state: supabaseToken || '',
  })

  return redirect(`https://github.com/login/oauth/authorize?${params}`)
}
