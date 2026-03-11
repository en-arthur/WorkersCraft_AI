'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth'
import { LandingNav } from '@/components/landing/landing-nav'
import { Hero } from '@/components/landing/hero'
import { Features } from '@/components/landing/features'
import { Demo } from '@/components/landing/demo'
import { CTA } from '@/components/landing/cta'
import { Footer } from '@/components/landing/footer'
import Logo from '@/components/logo'

export default function LandingPage() {
  const router = useRouter()
  const { session } = useAuth(() => {}, () => {})

  useEffect(() => {
    if (session) {
      router.push('/dashboard')
    }
  }, [session, router])

  // Show landing page (will redirect if session exists)
  return (
    <div className="min-h-screen">
      <LandingNav />
      <main className="pt-16">
        <Hero />
        <Features />
        <Demo />
        <CTA />
      </main>
      <Footer />
    </div>
  )
}
