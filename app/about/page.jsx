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
      <main className="max-w-2xl mx-auto px-4 pt-28 pb-20">
        <h1 className="text-3xl font-bold mb-4">About WorkersCraft AI</h1>
        <p className="text-muted-foreground mb-6 leading-relaxed">
          WorkersCraft AI is an AI-powered app builder that lets anyone turn ideas into
          full-stack web and mobile applications in minutes — no coding required.
        </p>
        <p className="text-muted-foreground mb-6 leading-relaxed">
          We believe building software should be accessible to everyone. Whether you're a
          founder validating an idea, a designer prototyping a product, or a developer
          moving fast — WorkersCraft AI removes the friction between imagination and a
          working app.
        </p>
        <p className="text-muted-foreground mb-6 leading-relaxed">
          Our platform supports Next.js, Streamlit, and Expo (React Native) out of the box,
          with real-time AI generation, live sandbox previews, and automatic project saving.
        </p>
        <h2 className="text-xl font-semibold mt-10 mb-3">Contact</h2>
        <p className="text-muted-foreground text-sm">
          For questions or support, reach us at{' '}
          <a href="mailto:hello@workerscraft.ai" className="underline hover:text-foreground transition-colors">
            hello@workerscraft.ai
          </a>
        </p>
      </main>
      <Footer />
    </>
  )
}
