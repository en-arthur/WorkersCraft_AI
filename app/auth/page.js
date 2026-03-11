'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ViewType } from '@/components/auth'
import { AuthDialog } from '@/components/auth-dialog'
import { supabase } from '@/lib/supabase'
import Logo from '@/components/logo'
import { Button } from '@/components/ui/button'

export default function AuthPage() {
  const router = useRouter()
  const [isAuthDialogOpen, setAuthDialog] = useState(false)
  const [authView, setAuthView] = useState('sign_in')
  const [isChecking, setIsChecking] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  useEffect(() => {
    let mounted = true

    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (mounted && session) {
          setIsAuthenticated(true)
          router.push('/dashboard')
        } else if (mounted) {
          setIsChecking(false)
        }
      } catch (error) {
        if (mounted) {
          setIsChecking(false)
        }
      }
    }

    checkSession()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (mounted) {
        if (session) {
          setIsAuthenticated(true)
          router.push('/dashboard')
        }
      }
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [router])

  const handleSignIn = () => {
    setAuthView('sign_in')
    setAuthDialog(true)
  }

  const handleSignUp = () => {
    setAuthView('sign_up')
    setAuthDialog(true)
  }

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
          <p className="text-muted-foreground text-sm">Redirecting to dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 bg-background">
      <AuthDialog
        open={isAuthDialogOpen}
        setOpen={setAuthDialog}
        view={authView}
        supabase={supabase}
      />
      
      <div className="w-full max-w-xs sm:max-w-sm text-center">
        <div className="flex items-center justify-center gap-2 mb-10">
          <Logo style="fragments" className="w-12 h-12" />
          <span className="font-bold text-3xl">WorkersCraft AI</span>
        </div>
        
        <h1 className="text-3xl font-bold mb-3">Welcome Back</h1>
        <p className="text-muted-foreground mb-10 text-base">
          Sign in to start building amazing applications
        </p>
        
        <div className="space-y-4 w-full">
          <Button 
            onClick={handleSignIn} 
            size="lg" 
            className="w-full h-12 text-base font-medium px-6"
          >
            Sign In
          </Button>
          <Button 
            onClick={handleSignUp} 
            size="lg" 
            variant="outline" 
            className="w-full h-12 text-base font-medium px-6"
          >
            Sign Up
          </Button>
        </div>
      </div>
    </div>
  )
}
