import { LandingNav } from '@/components/landing/landing-nav'
import { Footer } from '@/components/landing/footer'
import { Mail } from 'lucide-react'

export const metadata = {
  title: 'Support — WorkersCraft AI',
  description: 'Get help and support for WorkersCraft AI',
}

export default function SupportPage() {
  return (
    <>
      <LandingNav />

      <main className="min-h-screen bg-background">
        <section className="relative pt-48 pb-16 px-4 overflow-hidden">
          <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
            <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full bg-blue-500/10 blur-[120px]" />
          </div>

          <div className="max-w-4xl mx-auto text-center">
            <span className="inline-flex items-center gap-2 px-3 py-1 mb-6 rounded-full border border-border/60 bg-muted/40 text-xs font-medium text-muted-foreground tracking-wide uppercase">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
              Support
            </span>

            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight leading-tight mb-6">
              We&apos;re here to help
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Get the support you need to build amazing apps
            </p>
          </div>
        </section>

        <section className="px-4 pb-28">
          <div className="max-w-md mx-auto">
            <div className="rounded-2xl border border-border/60 bg-card/50 p-8 text-center">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Mail className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">Email Support</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Send us an email and we&apos;ll respond within 24 hours
              </p>
              <a href="mailto:support@workerscraft.ai" className="text-sm text-primary hover:underline">
                support@workerscraft.ai
              </a>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  )
}
