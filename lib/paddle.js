const PADDLE_API_BASE = process.env.NEXT_PUBLIC_PADDLE_ENV === 'production'
  ? 'https://api.paddle.com'
  : 'https://sandbox-api.paddle.com'

async function paddleRequest(path, options = {}) {
  const res = await fetch(`${PADDLE_API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.PADDLE_API_KEY}`,
      ...options.headers,
    },
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Paddle API error ${res.status}: ${text}`)
  }
  return res.json()
}

export async function createCheckoutUrl({ priceId, userId, userEmail, successUrl }) {
  const body = {
    items: [{ price_id: priceId, quantity: 1 }],
    custom_data: { user_id: userId },
    checkout: { url: successUrl },
  }
  if (userEmail) body.customer_email = userEmail
  const data = await paddleRequest('/transactions', {
    method: 'POST',
    body: JSON.stringify(body),
  })
  return data?.data?.checkout?.url
}

export async function getCustomerPortalUrl(customerId) {
  const data = await paddleRequest(`/customers/${customerId}/auth-token`, { method: 'GET' })
  const token = data?.data?.customer_auth_token
  const base = process.env.NEXT_PUBLIC_PADDLE_ENV === 'production'
    ? 'https://customer.paddle.com'
    : 'https://sandbox-customer.paddle.com'
  return `${base}?customerAuthToken=${token}`
}
