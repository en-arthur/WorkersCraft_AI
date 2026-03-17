'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Loader2, CheckCircle2 } from 'lucide-react'
import Logo from '@/components/logo'

const PLANS = [
  {
    id: 'starter',
    name: 'Starter',
    price: '$30',
    productId: process.env.NEXT_PUBLIC_POLAR_STARTER_PRODUCT_ID,
    features: ['AI app generation', 'Mobile builds', 'GitHub integration', 'Community support'],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '$50',
    productId: process.env.NEXT_PUBLIC_POLAR_PRO_PRODUCT_ID,
    features: ['Everything in Starter', 'Higher usage limits', 'Priority support', 'Advanced templates'],
  },
  {
    id: 'max',
    name: 'Max',
    price: '$100',
    productId: process.env.NEXT_PUBLIC_POLAR_MAX_PRODUCT_ID,
    features: ['Everything in Pro', 'Unlimited usage', 'Dedicated support', 'Early access to features'],
  },
]

export default function BillingPage() {
  const router = useRouter()
  const [session, setSession] = useState(null)
  const [subscription, setSubscription] = useState(null)
  const [loading, setLoading] = useState(true)
  const [checkoutLoading, setCheckoutLoading] = useState(null)
  const [portalLoading, setPortalLoading] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.push('/'); return }
      setSession(session)
      fetchSubscription(session)
    })
  }, [])

  async function fetchSubscription(sess) {
    const { data } = await supabase
      .from('user_subscriptions')
      .select('*')
      .eq('user_id', sess.user.id)
      .eq('status', 'active')
      .single()
    setSubscription(data)
    setLoading(false)
  }

  async function handleCheckout(productId, planId) {
    setCheckoutLoading(planId)
    const params = new URLSearchParams({ productId })
    if (session?.user?.id) params.set('customerId', session.user.id)
    window.location.href = `/api/checkout?${params}`
  }

  async function handlePortal() {
    setPortalLoading(true)
    const res = await fetch('/api/customer-portal', {
      headers: { Authorization: `Bearer ${session.access_token}` },
    })
    const data = await res.json()
    if (data.url) window.location.href = data.url
    else setPortalLoading(false)
  }

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <Loader2 className="w-6 h-6 animate-spin" />
    </div>
  )

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b px-6 py-4 flex items-center justify-between">
        <Logo />
        <Button variant="ghost" onClick={() => router.push('/dashboard')}>← Dashboard</Button>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-12">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold mb-2">Billing & Subscription</h1>
          <p className="text-muted-foreground">Choose a plan to start building AI-powered apps</p>
        </div>

        {subscription && (
          <div className="mb-8 p-4 border rounded-lg flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Current plan</p>
              <p className="font-semibold capitalize">{subscription.plan} — Active</p>
              {subscription.current_period_end && (
                <p className="text-xs text-muted-foreground">
                  Renews {new Date(subscription.current_period_end).toLocaleDateString()}
                </p>
              )}
            </div>
            <Button variant="outline" onClick={handlePortal} disabled={portalLoading}>
              {portalLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Manage Subscription
            </Button>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {PLANS.map((plan) => {
            const isCurrent = subscription?.plan === plan.id
            return (
              <Card key={plan.id} className={isCurrent ? 'border-primary' : ''}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>{plan.name}</CardTitle>
                    {isCurrent && <Badge>Current</Badge>}
                  </div>
                  <CardDescription>
                    <span className="text-2xl font-bold text-foreground">{plan.price}</span>
                    <span className="text-muted-foreground">/month</span>
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-center gap-2 text-sm">
                        <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>
                </CardContent>
                <CardFooter>
                  <Button
                    className="w-full"
                    variant={isCurrent ? 'outline' : 'default'}
                    disabled={isCurrent || checkoutLoading === plan.id}
                    onClick={() => !isCurrent && handleCheckout(plan.productId, plan.id)}
                  >
                    {checkoutLoading === plan.id
                      ? <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      : null}
                    {isCurrent ? 'Current Plan' : 'Subscribe'}
                  </Button>
                </CardFooter>
              </Card>
            )
          })}
        </div>
      </main>
    </div>
  )
}
