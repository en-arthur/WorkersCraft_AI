'use client'

import Link from 'next/link'
import Logo from '@/components/logo'
import { Button } from '@/components/ui/button'
import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'

const links = [
  { href: '/cloud', label: 'Cloud' },
  { href: '/changelog', label: 'Changelog' },
  { href: '/about', label: 'About' },
]

export function LandingNav() {
  const [scrolled, setScrolled] = useState(false)
  const [mounted, setMounted] = useState(false)
  const pathname = usePathname()

  useEffect(() => {
    setMounted(true)
    const onScroll = () => setScrolled(window.scrollY > 12)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <nav
      className={`fixed top-0 w-full z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-background/80 backdrop-blur-xl border-b border-white/10 shadow-lg shadow-black/20'
          : 'bg-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">

        {/* Logo */}
        <Link
          href="/"
          className="flex items-center gap-2.5 group"
        >
          <div className="transition-transform duration-300 group-hover:scale-110">
            <Logo style="fragments" className="w-7 h-7" />
          </div>
          <span className="font-bold text-base tracking-tight">WorkersCraft AI</span>
        </Link>

        {/* Nav links */}
        <div
          className={`flex items-center gap-1 transition-all duration-500 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'}`}
        >
          {links.map(({ href, label }) => {
            const active = pathname === href
            return (
              <Link
                key={href}
                href={href}
                className={`relative px-3 py-1.5 text-sm rounded-md transition-all duration-200 ${
                  active
                    ? 'text-foreground font-medium'
                    : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
                }`}
              >
                {label}
                {active && (
                  <span className="absolute inset-x-2 -bottom-px h-px bg-primary rounded-full" />
                )}
              </Link>
            )
          })}
        </div>

        {/* CTA */}
        <div className={`transition-all duration-500 delay-100 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'}`}>
          <Link href="/auth">
            <Button
              size="sm"
              className="relative overflow-hidden bg-primary hover:bg-primary/90 shadow-md shadow-primary/30 hover:shadow-lg hover:shadow-primary/40 transition-all duration-200 hover:-translate-y-px"
            >
              Launch App
            </Button>
          </Link>
        </div>

      </div>
    </nav>
  )
}
