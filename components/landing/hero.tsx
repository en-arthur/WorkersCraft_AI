import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowRight, Github } from 'lucide-react'

export function Hero() {
  return (
    <section className="flex flex-col items-center justify-center min-h-[80vh] px-4 text-center">
      <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
        Build Apps with AI
      </h1>
      <p className="text-xl md:text-2xl text-muted-foreground mb-8 max-w-2xl">
        Create interactive applications using natural language. Powered by E2B sandboxes for secure code execution.
      </p>
      <div className="flex gap-4 flex-wrap justify-center">
        <Link href="/chat">
          <Button size="lg" className="gap-2">
            Get Started <ArrowRight className="w-4 h-4" />
          </Button>
        </Link>
        <a href="https://github.com/e2b-dev/fragments" target="_blank" rel="noopener noreferrer">
          <Button size="lg" variant="outline" className="gap-2">
            <Github className="w-4 h-4" /> View on GitHub
          </Button>
        </a>
      </div>
    </section>
  )
}
