import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { LandingNav } from '@/components/landing/landing-nav'
import { Footer } from '@/components/landing/footer'
import { Database, Users, FileUp, Shield, Zap, Code2, ArrowRight, CheckCircle } from 'lucide-react'

const features = [
  {
    icon: Users,
    title: 'User Authentication',
    description: 'Built-in user management with secure sign up, login, and session handling out of the box.',
  },
  {
    icon: Database,
    title: 'Storage & Collections',
    description: 'Flexible NoSQL-style storage for your app data. Create collections, store records, query instantly.',
  },
  {
    icon: FileUp,
    title: 'File Uploads',
    description: 'Upload and serve files via a global CDN. Images, documents, and any binary data supported.',
  },
  {
    icon: Shield,
    title: 'Secure by Default',
    description: 'Every app gets isolated storage. Auth-gated endpoints and row-level access built in.',
  },
  {
    icon: Zap,
    title: 'Instant Provisioning',
    description: 'Your backend is created automatically when you build an app. Zero configuration needed.',
  },
  {
    icon: Code2,
    title: 'Auto-generated SDK',
    description: 'A typed SDK is injected into your generated app so it can talk to its backend immediately.',
  },
]

const steps = [
  { step: '01', title: 'Build with AI', description: 'Describe your app in natural language. WorkersCraft AI generates the full frontend.' },
  { step: '02', title: 'Backend auto-provisioned', description: 'A dedicated backend app is created on WorkersCraft Cloud — users, storage, files, all ready.' },
  { step: '03', title: 'Manage from dashboard', description: 'Inspect users, browse storage records, manage files — all from your project dashboard.' },
]

export default function CloudPage() {
  return (
    <div className="min-h-screen">
      <LandingNav />
      <main className="pt-16">

        {/* Hero */}
        <section className="flex flex-col items-center justify-center text-center px-4 py-24 max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-muted/50 text-sm mb-8 border">
            <Zap className="w-4 h-4 text-primary" />
            <span>Backend as a Service</span>
          </div>
          <h1 className="text-5xl md:text-6xl font-bold mb-6 tracking-tight">
            The backend that powers<br />
            <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-blue-600 bg-clip-text text-transparent">
              every WorkersCraft app
            </span>
          </h1>
          <p className="text-xl text-muted-foreground mb-10 max-w-2xl leading-relaxed">
            WorkersCraft Cloud is the backend infrastructure automatically provisioned for every app you build.
            Auth, storage, file uploads — all managed, all instant.
          </p>
          <Link href="/auth">
            <Button size="lg" className="gap-2 px-8 h-12 text-lg">
              Start Building <ArrowRight className="w-5 h-5" />
            </Button>
          </Link>
        </section>

        {/* Features */}
        <section className="px-4 py-20 bg-muted/20">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-4">Everything your app needs</h2>
            <p className="text-muted-foreground text-center mb-12 max-w-xl mx-auto">
              No setup, no config files, no DevOps. Your backend is ready the moment your app is generated.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {features.map(({ icon: Icon, title, description }) => (
                <div key={title} className="rounded-xl border bg-background p-6 flex flex-col gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Icon className="w-5 h-5 text-primary" />
                  </div>
                  <h3 className="font-semibold text-lg">{title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">{description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="px-4 py-20">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-4">How it works</h2>
            <p className="text-muted-foreground text-center mb-12 max-w-xl mx-auto">
              From idea to full-stack app in seconds.
            </p>
            <div className="flex flex-col gap-8">
              {steps.map(({ step, title, description }) => (
                <div key={step} className="flex gap-6 items-start">
                  <div className="text-4xl font-bold text-primary/20 w-12 shrink-0">{step}</div>
                  <div>
                    <h3 className="font-semibold text-lg mb-1">{title}</h3>
                    <p className="text-muted-foreground">{description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* What's included */}
        <section className="px-4 py-20 bg-muted/20">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl font-bold mb-4">Included with every app</h2>
            <p className="text-muted-foreground mb-10">No extra plans. No hidden limits during early access.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left">
              {[
                'Dedicated backend per app',
                'User authentication & sessions',
                'Unlimited storage collections',
                'File uploads & CDN delivery',
                'Auto-generated typed SDK',
                'Admin panel in your dashboard',
                'Secure isolated environment',
                'REST API access',
              ].map((item) => (
                <div key={item} className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-primary shrink-0" />
                  <span className="text-sm">{item}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="px-4 py-24 text-center">
          <div className="max-w-2xl mx-auto">
            <h2 className="text-4xl font-bold mb-4">Ready to build?</h2>
            <p className="text-muted-foreground mb-8 text-lg">
              Create your first AI-powered app and get a full backend automatically.
            </p>
            <Link href="/auth">
              <Button size="lg" className="gap-2 px-8 h-12 text-lg">
                Get Started Free <ArrowRight className="w-5 h-5" />
              </Button>
            </Link>
          </div>
        </section>

      </main>
      <Footer />
    </div>
  )
}
