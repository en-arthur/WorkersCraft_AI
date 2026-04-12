'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Loader2, CheckCircle2, Zap, Smartphone, Github, Server, Download, FolderOpen, Apple, Headphones, Rocket, Star } from 'lucide-react'
import UsageCard from '@/components/usage-card'
import { DiscountBanner } from '@/components/discount-banner'

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
      { text: 'Android debug builds (APK)', icon: Smartphone },
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
      { text: 'Android release builds (AAB)', icon: Smartphone },
      { text: 'iOS builds (coming soon)', icon: Apple },
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

export default function DashboardBillingPage() {
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
      .single()
    setSubscription(data)
    setLoading(false)
    return data
  }

  const [inlineCheckout, setInlineCheckout] = useState(null)

  // Capture Endorsely referral ID
  useEffect(() => {
    if (typeof window !== 'undefined' && window.endorsely_referral) {
      localStorage.setItem('endorsely_referral', window.endorsely_referral)
    }
  }, [])

  // Initialize Paddle.js
  useEffect(() => {
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
        const customData = {
          user_id: session.user.id
        }
        if (referralId) {
          customData.endorsely_referral = referralId
        }
        
        window.Paddle.Checkout.open({
          items: [{ priceId, quantity: 1 }],
          customer: { email: session?.user?.email },
          customData: customData,
          settings: { successUrl: `${window.location.origin}/dashboard/billing?success=true` }
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
    <div className="flex items-center justify-center py-20">
      <Loader2 className="w-6 h-6 animate-spin" />
    </div>
  )

  return (
    <div className="px-6 md:px-10 py-10 max-w-5xl mx-auto w-full">
      <div className="mb-10">
        <h1 className="text-2xl font-semibold tracking-tight mb-1">Billing & Subscription</h1>
        <p className="text-sm text-muted-foreground">Manage your plan. Cancel anytime.</p>
      </div>

      {processingPayment && (
        <div className="mb-8 p-4 rounded-xl bg-blue-500/10 border border-blue-500/40 text-blue-600 text-sm text-center flex items-center justify-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" /> Processing your subscription… this may take a few seconds.
        </div>
      )}
      {(checkoutError || portalError) && (
        <div className="mb-6 p-3 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-sm text-center">
          {checkoutError || portalError}
        </div>
      )}

      <UsageCard />

      {subscription && (
        <div className={`my-6 p-4 rounded-xl border flex items-center justify-between gap-4 ${
          subscription.status === 'canceled' ? 'bg-orange-500/10 border-orange-500/40' : 'bg-muted/40 border-border'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`w-2 h-2 rounded-full shrink-0 ${subscription.status === 'canceled' ? 'bg-orange-500' : 'bg-green-500'}`} />
            <div>
              <p className="font-medium text-sm capitalize">
                {subscription.plan} Plan — {subscription.status === 'canceled' ? 'Canceled' : 'Active'}
              </p>
              {subscription.current_period_end && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  {subscription.status === 'canceled'
                    ? `Access until ${new Date(subscription.current_period_end).toLocaleDateString()}`
                    : `Renews ${new Date(subscription.current_period_end).toLocaleDateString()}`}
                </p>
              )}
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={handlePortal} disabled={portalLoading}>
            {portalLoading && <Loader2 className="w-3 h-3 animate-spin mr-2" />}
            Manage
          </Button>
        </div>
      )}

      <DiscountBanner />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mt-8">
        {PLANS.map((plan) => {
          const isCurrent = subscription?.plan === plan.id && subscription?.status === 'active'
          return (
            <div
              key={plan.id}
              className={`relative rounded-2xl border p-6 flex flex-col transition-all duration-150 hover:shadow-lg hover:-translate-y-0.5 ${
                plan.popular && !isCurrent ? 'border-primary shadow-md' : 'border-border'
              } ${isCurrent ? 'border-green-500' : ''}`}
            >
              {(plan.popular || isCurrent) && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className={`text-xs font-semibold px-3 py-1 rounded-full ${
                    isCurrent ? 'bg-green-500 text-white' : 'bg-primary text-primary-foreground'
                  }`}>
                    {isCurrent ? 'Current Plan' : 'Most Popular'}
                  </span>
                </div>
              )}

              <div className="mb-5">
                <h2 className="text-lg font-bold mb-1">{plan.name}</h2>
                <p className="text-xs text-muted-foreground mb-4">{plan.description}</p>
                <div className="flex items-end gap-1">
                  <span className="text-3xl font-bold">{plan.price}</span>
                  <span className="text-sm text-muted-foreground mb-0.5">/mo</span>
                </div>
              </div>

              <div className="border-t mb-5" />

              <ul className="space-y-2.5 flex-1 mb-6">
                {plan.features.map(({ text, icon: Icon }) => (
                  <li key={text} className="flex items-center gap-2.5 text-sm">
                    <Icon className="w-3.5 h-3.5 text-primary shrink-0" />
                    {text}
                  </li>
                ))}
              </ul>

              <Button
                className="w-full"
                variant={isCurrent ? 'outline' : plan.popular ? 'default' : 'outline'}
                disabled={isCurrent || checkoutLoading === plan.id}
                onClick={() => handleCheckout(plan.priceId, plan.id)}
              >
                {checkoutLoading === plan.id && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                {isCurrent ? 'Current Plan' : subscription?.plan === plan.id && subscription?.status === 'canceled' ? 'Reactivate' : 'Get Started'}
              </Button>
            </div>
          )
        })}
      </div>

      <p className="text-center text-xs text-muted-foreground mt-8">
        All plans billed monthly. No hidden fees. Cancel anytime.
      </p>
    </div>
  )
}
