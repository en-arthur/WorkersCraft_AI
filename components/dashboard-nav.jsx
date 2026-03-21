'use client'

'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { LogOut, FolderOpen, CreditCard, Settings } from 'lucide-react'
import Logo from '@/components/logo'
import { supabase } from '@/lib/supabase'

export function DashboardNav() {
  const pathname = usePathname()
  const router = useRouter()

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/')
  }

  const links = [
    { href: '/dashboard', label: 'Projects', icon: FolderOpen },
    { href: '/dashboard/billing', label: 'Billing', icon: CreditCard },
  ]

  return (
    <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-2">
              <Logo style="fragments" className="w-8 h-8" />
              <span className="font-semibold text-lg">WorkersCraft AI</span>
            </Link>
            <div className="hidden md:flex items-center gap-1">
              {links.map(({ href, label, icon: Icon }) => (
                <Link key={href} href={href}>
                  <Button
                    variant={pathname === href ? 'secondary' : 'ghost'}
                    size="sm"
                    className="gap-2"
                  >
                    <Icon className="w-4 h-4" />
                    {label}
                  </Button>
                </Link>
              ))}
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={handleLogout} className="gap-2">
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Logout</span>
          </Button>
        </div>
      </div>
    </nav>
  )
}
