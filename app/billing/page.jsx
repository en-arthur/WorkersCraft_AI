'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Loader2, CheckCircle2, Zap, Smartphone, Github, Server, Download, FolderOpen, Apple, Headphones, Rocket, Star } from 'lucide-react'
import Logo from '@/components/logo'
import UsageCard from '@/components/usage-card'

const PLANS = [
  {
    id: 'starter',
    name: 'Starter',
    price: '$30',
    description: 'Perfect for indie developers getting started',
    priceId: process.env.NEXT_PUBLIC_PADDLE_STARTER_PRICE_ID,
    popular: false,
    features: [
      { text: 'AI app generation', icon: Zap },
      { text: 'Full-stack web & Android builds', icon: Smartphone },
      { text: 'GitHub integration', icon: Github },
      { text: 'Backend cloud access', icon: Server },
      { text: 'Source code export', icon: Download },
      { text: '12 projects per month', icon: FolderOpen },
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '$50',
    description: 'For teams shipping production apps',
    priceId: process.env.NEXT_PUBLIC_PADDLE_PRO_PRICE_ID,
    popular: true,
    features: [
      { text: 'Everything in Starter', icon: CheckCircle2 },
      { text: 'iOS app builds', icon: Apple },
      { text: '30 projects per month', icon: FolderOpen },
      { text: 'Priority support', icon: Headphones },
    ],
  },
  {
    id: 'max',
    name: 'Max',
    price: '$100',
    description: 'Unlimited power for serious builders',
    priceId: process.env.NEXT_PUBLIC_PADDLE_MAX_PRICE_ID,
    popular: false,
    features: [
      { text: 'Everything in Pro', icon: CheckCircle2 },
      { text: 'Unlimited projects per month', icon: Rocket },
      { text: 'Dedicated support', icon: Star },
      { text: 'Early access to new features', icon: Zap },
    ],
  },
]

export default function BillingPage() {
  const router = useRouter()
  const [session, setSession] = useState(null)
  const [subscription, setSubscription] = useState(null)
  const [loading, setLoading] = useState(true)
  const [checkoutLoading, setCheckoutLoading] = useState(null)
  const [portalLoading, setPortalLoading] = useState(false)
  const [checkoutError, setCheckoutError] = useState(null)
  const [portalError, setPortalError] = useState(null)
  const [processingPayment, setProcessingPayment] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.push('/'); return }
      setSession(session)
      fetchSubscription(session)
    })
    // detect post-checkout success
    if (typeof window !== 'undefined' && window.location.search.includes('success=true')) {
      setProcessingPayment(true)
      let attempts = 0
      const interval = setInterval(async () => {
        attempts++
        const { data: sess } = await supabase.auth.getSession()
        if (sess?.session) {
          const sub = await fetchSubscription(sess.session)
          if (sub) { clearInterval(interval); setProcessingPayment(false) }
        }
        if (attempts >= 10) { clearInterval(interval); setProcessingPayment(false) }
      }, 3000)
    }
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
    return data
  }

  const [inlineCheckout, setInlineCheckout] = useState(null) // { priceId, planId }

  // Initialize Paddle.js and capture referral
  useEffect(() => {
    // Capture Endorsely referral ID
    if (typeof window !== 'undefined' && window.endorsely_referral) {
      localStorage.setItem('endorsely_referral', window.endorsely_referral)
    }

    const initPaddle = () => {
      if (window.Paddle) {
        // Only set environment for sandbox, production is default
        if (process.env.NEXT_PUBLIC_PADDLE_ENV === 'sandbox') {
          window.Paddle.Environment.set('sandbox')
        }
        window.Paddle.Initialize({
          token: process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN
        })
      }
    }

    // If Paddle is already loaded, initialize immediately
    if (window.Paddle) {
      initPaddle()
    } else {
      // Otherwise wait for script to load
      window.addEventListener('paddleLoaded', initPaddle)
      // Fallback: check every 100ms for up to 5 seconds
      const checkInterval = setInterval(() => {
        if (window.Paddle) {
          initPaddle()
          clearInterval(checkInterval)
        }
      }, 100)
      setTimeout(() => clearInterval(checkInterval), 5000)
      
      return () => {
        window.removeEventListener('paddleLoaded', initPaddle)
        clearInterval(checkInterval)
      }
    }
  }, [])

  async function handleCheckout(priceId, planId) {
    setCheckoutError(null)
    setCheckoutLoading(planId)
    try {
      if (window.Paddle) {
        const referralId = localStorage.getItem('endorsely_referral')
        window.Paddle.Checkout.open({
          items: [{ priceId, quantity: 1 }],
          customer: { email: session?.user?.email },
          customData: { 
            user_id: session.user.id,
            ...(referralId && { endorsely_referral: referralId })
          },
          settings: { successUrl: `${window.location.origin}/billing?success=true` }
        })
      } else {
        throw new Error('Paddle not loaded')
      }
    } catch (error) {
      console.error('Checkout error:', error)
      setCheckoutError('Failed to start checkout. Please try again.')
    } finally {
      setCheckoutLoading(null)
    }
  }

  async function handleDevSkip() {
    await supabase.from('user_subscriptions').upsert({
      user_id: session.user.id,
      plan: 'pro',
      status: 'active',
      current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' })
    await fetchSubscription(session)
  }

  async function handlePortal() {
    setPortalError(null)
    setPortalLoading(true)
    try {
      const res = await fetch('/api/customer-portal', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      const data = await res.json()
      if (data.url) window.location.href = data.url
      else setPortalError('Failed to open portal. Please try again.')
    } catch {
      setPortalError('Failed to open portal. Please try again.')
    } finally {
      setPortalLoading(false)
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <Loader2 className="w-6 h-6 animate-spin" />
    </div>
  )

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b px-6 py-4 flex items-center justify-between">
        <Logo className="w-8 h-8" />
        <Button variant="ghost" size="sm" onClick={() => router.push('/dashboard')}>← Dashboard</Button>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-16">
        {processingPayment && (
          <div className="mb-8 p-4 rounded-xl bg-blue-500/10 border border-blue-500 text-blue-600 text-sm text-center flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" /> Processing your subscription… this may take a few seconds.
          </div>
        )}
        {checkoutError && (
          <div className="mb-6 p-3 rounded-xl bg-red-500/10 border border-red-500 text-red-600 text-sm text-center">
            {checkoutError}
          </div>
        )}
        {portalError && (
          <div className="mb-6 p-3 rounded-xl bg-red-500/10 border border-red-500 text-red-600 text-sm text-center">
            {portalError}
          </div>
        )}

        <UsageCard />
        {/* Hero */}
        <div className="text-center mb-14">
          <h1 className="text-4xl font-bold tracking-tight mb-3">Simple, transparent pricing</h1>
          <p className="text-muted-foreground text-lg">Build and ship AI-powered apps. Cancel anytime.</p>
        </div>

        {/* Current plan banner */}
        {subscription && (
          <div className="mb-10 p-5 rounded-xl border bg-muted/40 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              <div>
                <p className="font-semibold capitalize">{subscription.plan} Plan — Active</p>
                {subscription.current_period_end && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Renews {new Date(subscription.current_period_end).toLocaleDateString()}
                  </p>
                )}
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={handlePortal} disabled={portalLoading}>
              {portalLoading && <Loader2 className="w-3 h-3 animate-spin mr-2" />}
              Manage Subscription
            </Button>
          </div>
        )}

        {/* Plan cards */}
        <div className="grid grid-cols-3 gap-6">
          {PLANS.map((plan) => {
            const isCurrent = subscription?.plan === plan.id
            return (
              <div
                key={plan.id}
                className={`relative rounded-2xl border p-6 flex flex-col transition-shadow hover:shadow-lg ${
                  plan.popular ? 'border-primary shadow-md' : ''
                } ${isCurrent ? 'border-green-500' : ''}`}
              >
                {/* Popular badge */}
                {plan.popular && !isCurrent && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="bg-primary text-primary-foreground text-xs font-semibold px-3 py-1 rounded-full">
                      Most Popular
                    </span>
                  </div>
                )}
                {isCurrent && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="bg-green-500 text-white text-xs font-semibold px-3 py-1 rounded-full">
                      Current Plan
                    </span>
                  </div>
                )}

                {/* Plan header */}
                <div className="mb-6">
                  <h2 className="text-xl font-bold mb-1">{plan.name}</h2>
                  <p className="text-sm text-muted-foreground mb-4">{plan.description}</p>
                  <div className="flex items-end gap-1">
                    <span className="text-4xl font-bold">{plan.price}</span>
                    <span className="text-muted-foreground mb-1">/month</span>
                  </div>
                </div>

                {/* Divider */}
                <div className="border-t mb-6" />

                {/* Features */}
                <ul className="space-y-3 flex-1 mb-8">
                  {plan.features.map(({ text, icon: Icon }) => (
                    <li key={text} className="flex items-center gap-3 text-sm">
                      <Icon className="w-4 h-4 text-primary shrink-0" />
                      {text}
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                <Button
                  className="w-full"
                  variant={isCurrent ? 'outline' : plan.popular ? 'default' : 'outline'}
                  disabled={isCurrent || checkoutLoading === plan.id}
                  onClick={() => handleCheckout(plan.priceId, plan.id)}
                >
                  {checkoutLoading === plan.id && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                  {isCurrent ? 'Current Plan' : 'Get Started'}
                </Button>
              </div>
            )
          })}
        </div>

        {/* Footer note */}
        <p className="text-center text-sm text-muted-foreground mt-10">
          All plans billed monthly. No hidden fees. Cancel anytime.
        </p>


      </main>
    </div>
  )
}
