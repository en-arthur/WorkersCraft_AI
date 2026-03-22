import { LandingNav } from '@/components/landing/landing-nav'
import { Footer } from '@/components/landing/footer'

export const metadata = {
  title: 'About — WorkersCraft AI',
  description: 'Learn about WorkersCraft AI and our mission.',
}

export default function AboutPage() {
  return (
    <>
      <LandingNav />
      <main className="min-h-screen pt-32 pb-20 px-4">
        <div className="max-w-3xl mx-auto">
          
          {/* Hero */}
          <div className="text-center mb-16">
            <h1 className="text-4xl md:text-5xl font-bold mb-6 tracking-tight">
              Building the future of <br />
              <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-blue-400 bg-clip-text text-transparent">
                app development
              </span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Turn ideas into full-stack web and mobile apps in minutes — no coding required.
            </p>
          </div>

          {/* Mission */}
          <div className="space-y-8 mb-16">
            <div className="p-6 rounded-2xl border bg-card/50 backdrop-blur">
              <h2 className="text-xl font-semibold mb-3">Our Mission</h2>
              <p className="text-muted-foreground leading-relaxed">
                We believe building software should be accessible to everyone. Whether you&apos;re a
                founder validating an idea, a designer prototyping a product, or a developer
                moving fast — WorkersCraft AI removes the friction between imagination and a
                working app.
              </p>
            </div>

            <div className="p-6 rounded-2xl border bg-card/50 backdrop-blur">
              <h2 className="text-xl font-semibold mb-3">What We Build</h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                WorkersCraft AI is an AI-powered app builder that generates production-ready
                applications from natural language descriptions.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                <div className="px-3 py-2 rounded-lg bg-primary/10 text-center">Next.js</div>
                <div className="px-3 py-2 rounded-lg bg-primary/10 text-center">Streamlit</div>
                <div className="px-3 py-2 rounded-lg bg-primary/10 text-center">Expo (React Native)</div>
              </div>
            </div>
          </div>

          {/* Contact */}
          <div className="text-center p-8 rounded-2xl border bg-gradient-to-br from-primary/5 to-purple-500/5">
            <h2 className="text-xl font-semibold mb-2">Get in Touch</h2>
            <p className="text-muted-foreground text-sm mb-4">
              Questions or feedback? We&apos;d love to hear from you.
            </p>
            <a
              href="mailto:hello@workerscraft.ai"
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors font-medium text-sm"
            >
              hello@workerscraft.ai
            </a>
          </div>

        </div>
      </main>
      <Footer />
    </>
  )
}
