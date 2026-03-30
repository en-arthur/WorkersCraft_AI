import { LandingNav } from '@/components/landing/landing-nav'
import { Footer } from '@/components/landing/footer'
import { Target, Wrench, Zap, Rocket, Unlock, Settings, BarChart3, Smartphone } from 'lucide-react'

export const metadata = {
  title: 'About — WorkersCraft AI',
  description: 'Learn about WorkersCraft AI and our mission.',
}

export default function AboutPage() {
  return (
    <>
      <LandingNav />

      <main className="min-h-screen bg-background">

        {/* ── Hero ─────────────────────────────────────────────── */}
        <section className="relative pt-48 pb-24 px-4 overflow-hidden">
          {/* Ambient background blobs */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 -z-10"
          >
            <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[700px] h-[500px] rounded-full bg-blue-500/10 blur-[120px]" />
            <div className="absolute top-0 right-0 w-[400px] h-[400px] rounded-full bg-purple-500/10 blur-[100px]" />
          </div>

          <div className="max-w-3xl mx-auto text-center">
            {/* Eyebrow */}
            <span className="inline-flex items-center gap-2 px-3 py-1 mb-6 rounded-full border border-border/60 bg-muted/40 text-xs font-medium text-muted-foreground tracking-wide uppercase">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
              Our Story
            </span>

            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight leading-[1.1] mb-6">
              Building the future of{' '}
              <span className="text-foreground">
                app development
              </span>
            </h1>

            <p className="text-lg sm:text-xl text-muted-foreground max-w-xl mx-auto leading-relaxed">
              Turn ideas into full-stack web and mobile apps in minutes —
              no coding required.
            </p>
          </div>
        </section>

        {/* ── Content ──────────────────────────────────────────── */}
        <section className="px-4 pb-24">
          <div className="max-w-3xl mx-auto space-y-6">

            {/* Mission */}
            <div className="rounded-2xl border border-border/60 bg-card/50 backdrop-blur-sm p-8">
              <div className="flex items-start gap-4">
                <div className="shrink-0 mt-0.5 w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400">
                  <Target className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold mb-2">Our Mission</h2>
                  <p className="text-muted-foreground leading-relaxed text-sm sm:text-base">
                    We believe building software should be accessible to everyone. Whether
                    you&apos;re a founder validating an idea, a designer prototyping a product,
                    or a developer moving fast — WorkersCraft AI removes the friction between
                    imagination and a working app.
                  </p>
                </div>
              </div>
            </div>

            {/* What We Build */}
            <div className="rounded-2xl border border-border/60 bg-card/50 backdrop-blur-sm p-8">
              <div className="flex items-start gap-4">
                <div className="shrink-0 mt-0.5 w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400">
                  <Wrench className="w-5 h-5" />
                </div>
                <div className="w-full">
                  <h2 className="text-lg font-semibold mb-2">What We Build</h2>
                  <p className="text-muted-foreground leading-relaxed text-sm sm:text-base mb-5">
                    WorkersCraft AI is an AI-powered app builder that generates
                    production-ready applications from natural language descriptions.
                  </p>

                  {/* Tech stack pills */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {[
                      { label: 'Next.js', icon: Zap, desc: 'Web apps' },
                      { label: 'Next.js', icon: Wrench, desc: 'Web apps' },
                      { label: 'Expo', icon: Smartphone, desc: 'React Native' },
                    ].map((tech) => {
                      const Icon = tech.icon
                      return (
                      <div
                        key={tech.label}
                        className="flex items-center gap-3 px-4 py-3 rounded-xl bg-primary/8 border border-primary/10"
                      >
                        <Icon className="w-4 h-4 text-primary" />
                        <div>
                          <p className="text-sm font-medium leading-none">{tech.label}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{tech.desc}</p>
                        </div>
                      </div>
                    )})}
                  </div>
                </div>
              </div>
            </div>

            {/* Values row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { icon: Rocket, title: 'Speed', body: 'From idea to deployed app in minutes, not months.' },
                { icon: Unlock, title: 'Accessibility', body: 'No coding background needed to build real products.' },
                { icon: Settings, title: 'Production-ready', body: 'Code you can own, extend, and deploy anywhere.' },
              ].map((v) => {
                const Icon = v.icon
                return (
                <div
                  key={v.title}
                  className="rounded-2xl border border-border/60 bg-card/50 backdrop-blur-sm p-6"
                >
                  <Icon className="w-6 h-6 text-primary mb-3" />
                  <h3 className="text-sm font-semibold mb-1">{v.title}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">{v.body}</p>
                </div>
              )})}
            </div>

          </div>
        </section>

        {/* ── Contact CTA ──────────────────────────────────────── */}
        <section className="px-4 pb-28">
          <div className="max-w-3xl mx-auto">
            <div className="relative rounded-2xl border border-border/60 bg-gradient-to-br from-primary/5 via-background to-purple-500/5 p-10 text-center overflow-hidden">
              {/* Subtle glow */}
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 -z-10 rounded-2xl"
              >
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-64 h-32 bg-purple-500/10 blur-[60px]" />
              </div>

              <h2 className="text-xl font-semibold mb-2">Get in Touch</h2>
              <p className="text-muted-foreground text-sm mb-6 max-w-sm mx-auto">
                Questions or feedback? We&apos;d love to hear from you.
              </p>
              <a
                href="mailto:hello@workerscraft.com"
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 active:scale-95 transition-all font-medium text-sm shadow-sm"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  className="w-4 h-4"
                  aria-hidden
                >
                  <path d="M3 4a2 2 0 0 0-2 2v1.161l8.441 4.221a1.25 1.25 0 0 0 1.118 0L19 7.162V6a2 2 0 0 0-2-2H3Z" />
                  <path d="m19 8.839-7.77 3.885a2.75 2.75 0 0 1-2.46 0L1 8.839V14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8.839Z" />
                </svg>
                hello@workerscraft.com
              </a>
            </div>
          </div>
        </section>

      </main>

      <Footer />
    </>
  )
}