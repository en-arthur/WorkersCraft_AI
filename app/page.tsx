'use client'

import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/lib/auth'
import { LandingNav } from '@/components/landing/landing-nav'
import { Hero } from '@/components/landing/hero'
import { Features } from '@/components/landing/features'
import { Demo } from '@/components/landing/demo'
import { FAQ } from '@/components/landing/faq'
import { CTA } from '@/components/landing/cta'
import { Footer } from '@/components/landing/footer'
import { Reveal } from '@/components/landing/reveal'
import { Suspense } from 'react'

function LandingContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { session } = useAuth(() => {}, () => {})

  useEffect(() => {
    // Persist ref code from URL into localStorage so it survives navigation to /auth
    const ref = searchParams.get('ref')
    if (ref) {
      localStorage.setItem('affiliate_ref', ref)
    }
  }, [searchParams])

  useEffect(() => {
    if (session) router.push('/dashboard')
  }, [session, router])

  return (
    <div className="min-h-screen">
      <LandingNav />
      <main className="pt-16">
        <Hero />
        <Reveal><Features /></Reveal>
        <Reveal delay={80}><Demo /></Reveal>
        <Reveal delay={80}><FAQ /></Reveal>
        <Reveal delay={80}><CTA /></Reveal>
      </main>
      <Footer />
    </div>
  )
}

export default function LandingPage() {
  return (
    <Suspense fallback={<div className="min-h-screen" />}>
      <LandingContent />
    </Suspense>
  )
}
