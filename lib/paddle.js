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

export async function createCheckoutUrl({ priceId, userId, userEmail }) {
  const body = {
    items: [{ price_id: priceId, quantity: 1 }],
    custom_data: { user_id: userId },
  }
  if (userEmail) body.customer_email = userEmail
  const data = await paddleRequest('/transactions', {
    method: 'POST',
    body: JSON.stringify(body),
  })
  const txnId = data?.data?.id
  if (!txnId) return null

  // Use Paddle hosted checkout — fully hosted by Paddle, no Paddle.js required.
  // Create a hosted checkout in Paddle dashboard > Checkout > Hosted Checkouts
  // and set PADDLE_HOSTED_CHECKOUT_URL env var to the hsc_... URL.
  const hostedCheckoutUrl = process.env.PADDLE_HOSTED_CHECKOUT_URL
  if (!hostedCheckoutUrl) throw new Error('PADDLE_HOSTED_CHECKOUT_URL is not set')

  const params = new URLSearchParams({ transaction_id: txnId })
  if (userEmail) params.set('user_email', userEmail)
  return `${hostedCheckoutUrl}?${params.toString()}`
}

export async function getCustomerPortalUrl(customerId, subscriptionId) {
  const body = subscriptionId ? { subscription_ids: [subscriptionId] } : {}
  const data = await paddleRequest(`/customers/${customerId}/portal-sessions`, {
    method: 'POST',
    body: JSON.stringify(body),
  })
  return data?.data?.urls?.general?.overview ?? null
}
