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

export default function LandingPage() {
  const router = useRouter()
  const { session } = useAuth(() => {}, () => {})
  const [isChecking, setIsChecking] = useState(true)

  useEffect(() => {
    // Give auth time to initialize
    const timer = setTimeout(() => {
      setIsChecking(false)
    }, 500)
    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    if (!isChecking && session) {
      router.push('/chat')
    }
  }, [session, isChecking, router])

  // Show loading while checking auth
  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    )
  }

  // Don't render landing if authenticated
  if (session) {
    return null
  }

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
