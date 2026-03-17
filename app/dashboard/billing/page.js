'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function DashboardBillingPage() {
  const router = useRouter()
  useEffect(() => { router.replace('/billing') }, [])
  return null
}
