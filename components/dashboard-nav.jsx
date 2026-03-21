'use client'

'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { FolderOpen, CreditCard } from 'lucide-react'

export function DashboardNav() {
  const pathname = usePathname()

  const links = [
    { href: '/dashboard', label: 'Projects', icon: FolderOpen },
    { href: '/dashboard/billing', label: 'Billing', icon: CreditCard },
  ]

  return (
    <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center h-16">
          <div className="flex items-center gap-1">
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
      </div>
    </nav>
  )
}
