import Link from 'next/link'
import Logo from '@/components/logo'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { Button } from '@/components/ui/button'
import { Github } from 'lucide-react'

export function LandingNav() {
  return (
    <nav className="fixed top-0 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-50">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <Logo />
        </Link>
        
        <div className="flex items-center gap-4">
          <a href="https://github.com/e2b-dev/fragments" target="_blank" rel="noopener noreferrer">
            <Button variant="ghost" size="sm" className="gap-2">
              <Github className="w-4 h-4" />
              <span className="hidden sm:inline">GitHub</span>
            </Button>
          </a>
          <ThemeToggle />
          <Link href="/chat">
            <Button size="sm">Launch App</Button>
          </Link>
        </div>
      </div>
    </nav>
  )
}
