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
  const [isChecking, setIsChecking] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  useEffect(() => {
    // Give auth time to initialize
    const timer = setTimeout(() => {
      setIsChecking(false)
    }, 500)
    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    if (!isChecking && session) {
      setIsAuthenticated(true)
      router.push('/chat')
    }
  }, [session, isChecking, router])

  // Show loading while checking auth
  if (isChecking) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-16 h-16 rounded-full border-4 border-muted animate-spin" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
              <Logo style="fragments" className="w-8 h-8" />
            </div>
          </div>
          <p className="text-muted-foreground text-sm">Loading...</p>
        </div>
      </div>
    )
  }

  // Don't render if authenticated (redirecting)
  if (isAuthenticated) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-16 h-16 rounded-full border-4 border-primary animate-spin" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
              <Logo style="fragments" className="w-8 h-8" />
            </div>
          </div>
          <p className="text-muted-foreground text-sm">Redirecting to chat...</p>
        </div>
      </div>
    )
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
