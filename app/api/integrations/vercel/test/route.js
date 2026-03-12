export async function POST(request) {
  const body = await request.json()
  const { token } = body

  if (!token) {
    return Response.json({ valid: false, error: 'No token provided' }, { status: 400 })
  }

  try {
    // Test the Vercel token by fetching user info
    const res = await fetch('https://api.vercel.com/v2/user', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })

    if (res.ok) {
      const data = await res.json()
      return Response.json({ 
        valid: true, 
        user: { 
          username: data.user?.username,
          email: data.user?.email 
        } 
      })
    } else {
      return Response.json({ valid: false, error: 'Invalid token' })
    }
  } catch (error) {
    return Response.json({ valid: false, error: error.message }, { status: 500 })
  }
}
