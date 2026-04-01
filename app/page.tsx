'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth'
import { LandingNav } from '@/components/landing/landing-nav'
import { Hero } from '@/components/landing/hero'
import { Templates } from '@/components/landing/templates'
import { Features } from '@/components/landing/features'
import { Demo } from '@/components/landing/demo'
import { FAQ } from '@/components/landing/faq'
import { CTA } from '@/components/landing/cta'
import { Footer } from '@/components/landing/footer'
import { Reveal } from '@/components/landing/reveal'

export default function LandingPage() {
  const router = useRouter()
  const { session } = useAuth(() => {}, () => {})

  useEffect(() => {
    if (session) router.push('/dashboard')
  }, [session, router])

  return (
    <div className="min-h-screen">
      <LandingNav />
      <main className="pt-16">
        <Hero />
        <Reveal><Templates /></Reveal>
        <Reveal delay={80}><Features /></Reveal>
        <Reveal delay={80}><Demo /></Reveal>
        <Reveal delay={80}><FAQ /></Reveal>
        <Reveal delay={80}><CTA /></Reveal>
      </main>
      <Footer />
    </div>
  )
}
