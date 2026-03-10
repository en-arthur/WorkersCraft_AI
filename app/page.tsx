'use client'

import { LandingNav } from '@/components/landing/landing-nav'
import { Hero } from '@/components/landing/hero'
import { Features } from '@/components/landing/features'
import { TechStack } from '@/components/landing/tech-stack'
import { CTA } from '@/components/landing/cta'
import { Footer } from '@/components/landing/footer'

export default function LandingPage() {
  return (
    <div className="min-h-screen">
      <LandingNav />
      <main className="pt-16">
        <Hero />
        <Features />
        <TechStack />
        <CTA />
      </main>
      <Footer />
    </div>
  )
}
