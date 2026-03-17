import { polar } from '@/lib/polar'

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const products = searchParams.getAll('products')

  if (products.length === 0) {
    return Response.json({ error: 'Missing products in query params' }, { status: 400 })
  }

  try {
    const checkout = await polar.checkouts.create({
      products,
      successUrl: `${process.env.NEXT_PUBLIC_SITE_URL}/billing?checkout_id={CHECKOUT_ID}`,
      customerId: searchParams.get('customerId') ?? undefined,
      externalCustomerId: searchParams.get('customerExternalId') ?? undefined,
      customerEmail: searchParams.get('customerEmail') ?? undefined,
    })

    return Response.redirect(checkout.url, 302)
  } catch (error) {
    console.error(error)
    return new Response('Checkout failed', { status: 500 })
  }
}
