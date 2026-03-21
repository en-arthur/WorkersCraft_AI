'use client'

import { useEffect, useRef } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { LandingNav } from '@/components/landing/landing-nav'
import { Footer } from '@/components/landing/footer'
import { Database, Users, FileUp, Shield, Zap, Code2, ArrowRight, CheckCircle } from 'lucide-react'

function useScrollReveal() {
  const ref = useRef(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { el.classList.add('revealed'); observer.disconnect() } },
      { threshold: 0.15 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])
  return ref
}

function Reveal({ children, className = '', delay = 0 }) {
  const ref = useScrollReveal()
  return (
    <div
      ref={ref}
      className={`scroll-reveal ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  )
}

const features = [
  { icon: Users,    title: 'User Authentication',    description: 'Built-in user management with secure sign up, login, and session handling out of the box.' },
  { icon: Database, title: 'Storage & Collections',  description: 'Flexible NoSQL-style storage for your app data. Create collections, store records, query instantly.' },
  { icon: FileUp,   title: 'File Uploads',           description: 'Upload and serve files via a global CDN. Images, documents, and any binary data supported.' },
  { icon: Shield,   title: 'Secure by Default',      description: 'Every app gets isolated storage. Auth-gated endpoints and row-level access built in.' },
  { icon: Zap,      title: 'Instant Provisioning',   description: 'Your backend is created automatically when you build an app. Zero configuration needed.' },
  { icon: Code2,    title: 'Auto-generated SDK',     description: 'A typed SDK is injected into your generated app so it can talk to its backend immediately.' },
]

const steps = [
  { step: '01', title: 'Build with AI',              description: 'Describe your app in natural language. WorkersCraft AI generates the full frontend.' },
  { step: '02', title: 'Backend auto-provisioned',   description: 'A dedicated backend is created on WorkersCraft Cloud — users, storage, files, all ready.' },
  { step: '03', title: 'Manage from dashboard',      description: 'Inspect users, browse storage records, manage files — all from your project dashboard.' },
]

const included = [
  'Dedicated backend per app', 'User authentication & sessions',
  'Unlimited storage collections', 'File uploads & CDN delivery',
  'Auto-generated typed SDK', 'Admin panel in your dashboard',
  'Secure isolated environment', 'REST API access',
]

export default function CloudPage() {
  return (
    <div className="min-h-screen bg-background">
      <style>{`
        .scroll-reveal {
          opacity: 0;
          transform: translateY(32px);
          transition: opacity 0.6s ease, transform 0.6s ease;
        }
        .scroll-reveal.revealed {
          opacity: 1;
          transform: translateY(0);
        }
        .glass-card {
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.1);
          backdrop-filter: blur(16px);
        }
        .gradient-border {
          position: relative;
        }
        .gradient-border::before {
          content: '';
          position: absolute;
          inset: 0;
          border-radius: inherit;
          padding: 1px;
          background: linear-gradient(135deg, #3b82f6, #8b5cf6, #3b82f6);
          -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
          -webkit-mask-composite: xor;
          mask-composite: exclude;
          pointer-events: none;
        }
        .bg-grid-white {
          background-image: linear-gradient(to right, rgba(255,255,255,0.05) 1px, transparent 1px),
                            linear-gradient(to bottom, rgba(255,255,255,0.05) 1px, transparent 1px);
        }
        @keyframes gradient {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        .animate-gradient {
          background-size: 200% 200%;
          animation: gradient 8s ease infinite;
        }
      `}</style>

      <LandingNav />
      <main className="pt-16">

        {/* Hero */}
        <section className="relative flex flex-col items-center justify-center text-center px-4 py-32 md:py-40 max-w-6xl mx-auto overflow-hidden">
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(99,102,241,0.2),transparent)]" />
          <div className="absolute inset-0 -z-10 bg-grid-white/[0.02] bg-[size:50px_50px]" />
          <Reveal>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-sm mb-8 border border-primary/20">
              <Zap className="w-4 h-4 text-primary" />
              <span className="font-medium">Backend as a Service</span>
            </div>
          </Reveal>
          <Reveal delay={100}>
            <h1 className="text-5xl md:text-7xl font-bold mb-6 tracking-tight leading-[1.1]">
              The backend that powers<br />
              <span className="bg-gradient-to-r from-blue-500 via-purple-500 to-blue-500 bg-clip-text text-transparent animate-gradient">
                every WorkersCraft app
              </span>
            </h1>
          </Reveal>
          <Reveal delay={200}>
            <p className="text-xl md:text-2xl text-muted-foreground mb-10 max-w-3xl leading-relaxed">
              WorkersCraft Cloud is the backend infrastructure automatically provisioned for every app you build.
              Auth, storage, file uploads — all managed, all instant.
            </p>
          </Reveal>
          <Reveal delay={300}>
            <Link href="/auth">
              <Button size="lg" className="gap-2 px-8 h-14 text-lg shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-all">
                Start Building <ArrowRight className="w-5 h-5" />
              </Button>
            </Link>
          </Reveal>
        </section>

        {/* Features */}
        <section className="px-4 py-24 md:py-32 relative">
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_60%_40%_at_50%_50%,rgba(139,92,246,0.1),transparent)]" />
          <div className="max-w-7xl mx-auto">
            <Reveal>
              <h2 className="text-4xl md:text-5xl font-bold text-center mb-4">Everything your app needs</h2>
              <p className="text-lg text-muted-foreground text-center mb-16 max-w-2xl mx-auto">
                No setup, no config files, no DevOps. Your backend is ready the moment your app is generated.
              </p>
            </Reveal>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {features.map(({ icon: Icon, title, description }, i) => (
                <Reveal key={title} delay={i * 80}>
                  <div className="glass-card gradient-border rounded-2xl p-8 flex flex-col gap-4 h-full hover:bg-white/5 hover:scale-[1.02] transition-all duration-300">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-600/20 to-purple-600/20 flex items-center justify-center border border-white/10">
                      <Icon className="w-6 h-6 text-primary" />
                    </div>
                    <h3 className="font-semibold text-xl">{title}</h3>
                    <p className="text-muted-foreground leading-relaxed">{description}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="px-4 py-24">
          <div className="max-w-3xl mx-auto">
            <Reveal>
              <h2 className="text-4xl font-bold text-center mb-4">How it works</h2>
              <p className="text-muted-foreground text-center mb-16 max-w-xl mx-auto">From idea to full-stack app in seconds.</p>
            </Reveal>
            <div className="flex flex-col gap-6 relative">
              <div className="absolute left-6 top-8 bottom-8 w-px bg-gradient-to-b from-blue-600/50 via-purple-600/50 to-transparent" />
              {steps.map(({ step, title, description }, i) => (
                <Reveal key={step} delay={i * 120}>
                  <div className="flex gap-6 items-start pl-2">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center text-white text-sm font-bold shrink-0 z-10">
                      {step}
                    </div>
                    <div className="glass-card rounded-2xl p-5 flex-1">
                      <h3 className="font-semibold text-lg mb-1">{title}</h3>
                      <p className="text-muted-foreground text-sm leading-relaxed">{description}</p>
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* Included */}
        <section className="px-4 py-24 relative">
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_60%_40%_at_50%_50%,rgba(59,130,246,0.07),transparent)]" />
          <div className="max-w-3xl mx-auto text-center">
            <Reveal>
              <h2 className="text-4xl font-bold mb-4">Included with every app</h2>
              <p className="text-muted-foreground mb-12">No extra plans. No hidden limits during early access.</p>
            </Reveal>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left">
              {included.map((item, i) => (
                <Reveal key={item} delay={i * 60}>
                  <div className="glass-card rounded-xl px-5 py-4 flex items-center gap-3 hover:bg-white/5 transition-colors">
                    <CheckCircle className="w-5 h-5 text-primary shrink-0" />
                    <span className="text-sm font-medium">{item}</span>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="px-4 py-32 md:py-40 text-center relative">
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_80%_60%_at_50%_50%,rgba(99,102,241,0.15),transparent)]" />
          <Reveal>
            <div className="max-w-3xl mx-auto glass-card gradient-border rounded-3xl px-10 py-20 shadow-2xl">
              <h2 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">Ready to build?</h2>
              <p className="text-muted-foreground mb-10 text-lg md:text-xl max-w-xl mx-auto leading-relaxed">
                Create your first AI-powered app and get a full backend automatically.
              </p>
              <Link href="/auth">
                <Button size="lg" className="gap-2 px-10 h-14 text-lg shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-all">
                  Get Started Free <ArrowRight className="w-5 h-5" />
                </Button>
              </Link>
            </div>
          </Reveal>
        </section>

      </main>
      <Footer />
    </div>
  )
}
