import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowRight, Sparkles } from 'lucide-react'

export function Hero() {
  return (
    <section className="relative flex flex-col items-center justify-center min-h-[85vh] px-4 text-center overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-blue-100/50 via-background to-background dark:from-blue-950/30 dark:via-background dark:to-background" />
      
      <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-muted/50 text-sm mb-8 border">
        <Sparkles className="w-4 h-4 text-primary" />
        <span>AI-Powered Application Builder</span>
      </div>
      
      <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold mb-6 tracking-tight">
        Build Apps with <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-blue-600 bg-clip-text text-transparent animate-gradient">AI</span>
      </h1>
      
      <p className="text-xl md:text-2xl text-muted-foreground mb-10 max-w-3xl leading-relaxed">
        Transform your ideas into interactive applications using natural language. 
        WorkersCraft AI creates production-ready apps in seconds.
      </p>
      
      <div className="flex gap-4 flex-wrap justify-center">
        <Link href="/auth">
          <Button size="lg" className="gap-2 px-8 h-12 text-lg">
            Get Started <ArrowRight className="w-5 h-5" />
          </Button>
        </Link>
      </div>
    </section>
  )
}
