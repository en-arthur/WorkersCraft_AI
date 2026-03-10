'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ViewType } from '@/components/auth'
import { AuthDialog } from '@/components/auth-dialog'
import { useAuth } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import Logo from '@/components/logo'
import { Button } from '@/components/ui/button'

export default function AuthPage() {
  const router = useRouter()
  const { session } = useAuth(() => {}, () => {})
  const [isAuthDialogOpen, setAuthDialog] = useState(false)
  const [authView, setAuthView] = useState('sign_in')

  useEffect(() => {
    if (session) {
      router.push('/chat')
    }
  }, [session, router])

  const handleSignIn = () => {
    setAuthView('sign_in')
    setAuthDialog(true)
  }

  const handleSignUp = () => {
    setAuthView('sign_up')
    setAuthDialog(true)
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4">
      <AuthDialog
        open={isAuthDialogOpen}
        setOpen={setAuthDialog}
        view={authView}
        supabase={supabase}
      />
      
      <div className="w-full max-w-md text-center">
        <div className="flex items-center justify-center gap-2 mb-8">
          <Logo style="fragments" className="w-10 h-10" />
          <span className="font-bold text-2xl">WorkersCraft AI</span>
        </div>
        
        <h1 className="text-3xl font-bold mb-2">Welcome Back</h1>
        <p className="text-muted-foreground mb-8">
          Sign in to start building amazing applications
        </p>
        
        <div className="space-y-3">
          <Button 
            onClick={handleSignIn} 
            size="lg" 
            className="w-full h-12 text-lg"
          >
            Sign In
          </Button>
          <Button 
            onClick={handleSignUp} 
            size="lg" 
            variant="outline" 
            className="w-full h-12 text-lg"
          >
            Sign Up
          </Button>
        </div>
      </div>
    </div>
  )
}
