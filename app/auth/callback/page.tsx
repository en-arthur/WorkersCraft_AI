'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function AuthCallback() {
  const router = useRouter()

  useEffect(() => {
    supabase?.auth.getSession().then(({ data: { session } }) => {
      router.replace(session ? '/dashboard' : '/auth')
    })
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-muted-foreground text-sm">Signing you in...</p>
    </div>
  )
}
