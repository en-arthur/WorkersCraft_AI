import Link from 'next/link'
import Logo from '@/components/logo'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { Button } from '@/components/ui/button'

export function LandingNav() {
  return (
    <nav className="fixed top-0 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-50">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <Logo style="fragments" className="w-8 h-8" />
          <span className="font-bold text-xl">WorkersCraft AI</span>
        </Link>
        
        <div className="flex items-center gap-4">
          <Link href="/cloud" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            Cloud
          </Link>
          <ThemeToggle />
          <Link href="/auth">
            <Button size="sm">Launch App</Button>
          </Link>
        </div>
      </div>
    </nav>
  )
}
