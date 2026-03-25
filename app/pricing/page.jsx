import { LandingNav } from '@/components/landing/landing-nav'
import { Footer } from '@/components/landing/footer'
import { Button } from '@/components/ui/button'
import { Check } from 'lucide-react'
import Link from 'next/link'

export const metadata = {
  title: 'Pricing — WorkersCraft AI',
  description: 'Simple, transparent pricing for everyone.',
}

const plans = [
  {
    name: 'Free',
    price: '$0',
    period: 'forever',
    description: 'Perfect for trying out WorkersCraft AI',
    features: [
      '3 projects',
      '50 AI generations/month',
      'Next.js & Streamlit templates',
      'Live sandbox preview',
      'Community support',
    ],
    cta: 'Get Started',
    href: '/auth',
    popular: false,
  },
  {
    name: 'Starter',
    price: '$29',
    period: 'per month',
    description: 'For indie developers and small teams',
    features: [
      'Unlimited projects',
      '500 AI generations/month',
      'All templates (Next.js, Streamlit, Expo)',
      'Backend (auth, storage, files)',
      'GitHub integration',
      'Priority support',
    ],
    cta: 'Start Free Trial',
    href: '/auth',
    popular: true,
  },
  {
    name: 'Pro',
    price: '$99',
    period: 'per month',
    description: 'For teams building at scale',
    features: [
      'Everything in Starter',
      'Unlimited AI generations',
      'Custom templates',
      'Team collaboration',
      'Advanced analytics',
      'Dedicated support',
      'Custom integrations',
    ],
    cta: 'Contact Sales',
    href: 'mailto:hello@workerscraft.ai',
    popular: false,
  },
]

export default function PricingPage() {
  return (
    <>
      <LandingNav />

      <main className="min-h-screen bg-background">

        {/* Hero */}
        <section className="relative pt-48 pb-16 px-4 overflow-hidden">
          <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
            <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full bg-blue-500/10 blur-[120px]" />
          </div>

          <div className="max-w-4xl mx-auto text-center">
            <span className="inline-flex items-center gap-2 px-3 py-1 mb-6 rounded-full border border-border/60 bg-muted/40 text-xs font-medium text-muted-foreground tracking-wide uppercase">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
              Pricing
            </span>

            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight leading-tight mb-6">
              Simple, transparent pricing
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Start free, upgrade when you need more. No hidden fees.
            </p>
          </div>
        </section>

        {/* Pricing Cards */}
        <section className="px-4 pb-28">
          <div className="max-w-6xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {plans.map((plan) => (
                <div
                  key={plan.name}
                  className={`relative rounded-2xl border p-8 flex flex-col ${
                    plan.popular
                      ? 'border-primary bg-gradient-to-br from-primary/5 via-background to-purple-500/5 shadow-lg'
                      : 'border-border/60 bg-card/50'
                  }`}
                >
                  {plan.popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <span className="px-3 py-1 rounded-full bg-primary text-primary-foreground text-xs font-semibold">
                        Most Popular
                      </span>
                    </div>
                  )}

                  <div className="mb-6">
                    <h3 className="text-xl font-bold mb-2">{plan.name}</h3>
                    <div className="flex items-baseline gap-1 mb-2">
                      <span className="text-4xl font-bold">{plan.price}</span>
                      <span className="text-muted-foreground text-sm">/{plan.period}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">{plan.description}</p>
                  </div>

                  <ul className="space-y-3 mb-8 flex-1">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2 text-sm">
                        <Check className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <Link href={plan.href} className="w-full">
                    <Button
                      className={`w-full ${
                        plan.popular
                          ? 'bg-primary hover:bg-primary/90'
                          : 'bg-muted hover:bg-muted/80'
                      }`}
                      variant={plan.popular ? 'default' : 'outline'}
                    >
                      {plan.cta}
                    </Button>
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="px-4 pb-28">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-12">Frequently Asked Questions</h2>
            <div className="space-y-6">
              {[
                {
                  q: 'Can I change plans later?',
                  a: 'Yes, you can upgrade or downgrade at any time. Changes take effect immediately.',
                },
                {
                  q: 'What happens when I hit my generation limit?',
                  a: "You'll be notified when you're close to your limit. You can upgrade anytime or wait until next month.",
                },
                {
                  q: 'Can I cancel anytime?',
                  a: 'Absolutely. Cancel anytime from your dashboard. No questions asked.',
                },
              ].map((faq) => (
                <div key={faq.q} className="rounded-2xl border border-border/60 bg-card/50 p-6">
                  <h3 className="font-semibold mb-2">{faq.q}</h3>
                  <p className="text-sm text-muted-foreground">{faq.a}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

      </main>

      <Footer />
    </>
  )
}
