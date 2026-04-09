'use client'

import Link from 'next/link'
import Logo from '@/components/logo'
import { Button } from '@/components/ui/button'
import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { Menu, X } from 'lucide-react'

const links = [
  { href: '/pricing', label: 'Pricing' },
  { href: '/cloud', label: 'Cloud' },
  { href: '/about', label: 'About' },
  { href: '/support', label: 'Support' },
]

export function LandingNav() {
  const [scrolled, setScrolled] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const pathname = usePathname()

  useEffect(() => {
    setMounted(true)
    const onScroll = () => setScrolled(window.scrollY > 12)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Close mobile menu on route change
  useEffect(() => { setMobileOpen(false) }, [pathname])

  return (
    <nav className={`fixed top-0 w-full z-50 transition-all duration-300 ${
      scrolled || mobileOpen
        ? 'bg-background/90 backdrop-blur-xl border-b border-white/10 shadow-lg shadow-black/20'
        : 'bg-transparent'
    }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">

        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 group shrink-0">
          <div className="transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3">
            <Logo style="fragments" className="w-7 h-7" />
          </div>
          <span className="font-bold text-sm sm:text-base tracking-tight whitespace-nowrap bg-clip-text transition-all duration-300 group-hover:text-primary">
            WorkersCraft AI
          </span>
        </Link>

        {/* Desktop Nav links */}
        <div className="hidden md:flex items-center gap-1">
          {links.map(({ href, label }, i) => {
            const active = pathname === href
            return (
              <Link
                key={href}
                href={href}
                style={{
                  transitionDelay: mounted ? `${i * 50}ms` : '0ms',
                  opacity: mounted ? 1 : 0,
                  transform: mounted ? 'translateY(0)' : 'translateY(-8px)',
                  transition: 'opacity 0.4s ease, transform 0.4s ease, color 0.2s ease, background 0.2s ease',
                }}
                className={`relative px-3 py-1.5 text-sm rounded-md overflow-hidden group/link ${
                  active ? 'text-foreground font-medium' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {/* Hover background */}
                <span className="absolute inset-0 bg-white/5 opacity-0 group-hover/link:opacity-100 transition-opacity duration-200 rounded-md" />
                {label}
                {/* Animated underline */}
                <span className={`absolute inset-x-2 -bottom-px h-px bg-primary rounded-full transition-all duration-300 origin-left ${
                  active ? 'scale-x-100' : 'scale-x-0 group-hover/link:scale-x-100'
                }`} />
              </Link>
            )
          })}
        </div>

        {/* Right side */}
        <div className="flex items-center gap-2 shrink-0">
          {/* CTA */}
          <div style={{
            opacity: mounted ? 1 : 0,
            transform: mounted ? 'translateY(0)' : 'translateY(-8px)',
            transition: 'opacity 0.4s ease 0.2s, transform 0.4s ease 0.2s',
          }}>
            <Link href="/auth">
              <Button
                size="sm"
                className="relative overflow-hidden bg-primary hover:bg-primary/90 shadow-md shadow-primary/30 hover:shadow-lg hover:shadow-primary/40 transition-all duration-200 hover:-translate-y-px"
              >
                {/* Pulse ring */}
                <span className="absolute inset-0 rounded-md ring-2 ring-primary/40 animate-ping opacity-30 pointer-events-none" />
                Launch App
              </Button>
            </Link>
          </div>

          {/* Mobile hamburger */}
          <button
            className="md:hidden p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors duration-200"
            onClick={() => setMobileOpen(o => !o)}
            aria-label="Toggle menu"
          >
            <span className={`block transition-all duration-200 ${mobileOpen ? 'rotate-90 opacity-0 absolute' : 'rotate-0 opacity-100'}`}>
              <Menu className="w-5 h-5" />
            </span>
            <span className={`block transition-all duration-200 ${mobileOpen ? 'rotate-0 opacity-100' : '-rotate-90 opacity-0 absolute'}`}>
              <X className="w-5 h-5" />
            </span>
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      <div className={`md:hidden overflow-hidden transition-all duration-300 ease-in-out ${
        mobileOpen ? 'max-h-64 opacity-100' : 'max-h-0 opacity-0'
      }`}>
        <div className="px-4 pb-4 flex flex-col gap-1 border-t border-white/10">
          {links.map(({ href, label }) => {
            const active = pathname === href
            return (
              <Link
                key={href}
                href={href}
                className={`px-3 py-2.5 text-sm rounded-md transition-all duration-200 ${
                  active
                    ? 'text-foreground font-medium bg-white/5'
                    : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
                }`}
              >
                {label}
              </Link>
            )
          })}
          <Link href="/auth" className="mt-2">
            <Button size="sm" className="w-full bg-primary hover:bg-primary/90">
              Launch App
            </Button>
          </Link>
        </div>
      </div>
    </nav>
  )
}
