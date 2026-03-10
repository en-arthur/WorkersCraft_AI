import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowRight } from 'lucide-react'

export function CTA() {
  return (
    <section className="py-20 px-4">
      <div className="max-w-4xl mx-auto text-center">
        <h2 className="text-3xl md:text-5xl font-bold mb-6">
          Ready to Build Something Amazing?
        </h2>
        <p className="text-xl text-muted-foreground mb-8">
          Start creating interactive applications with AI in seconds
        </p>
        <Link href="/chat">
          <Button size="lg" className="gap-2">
            Start Building <ArrowRight className="w-4 h-4" />
          </Button>
        </Link>
      </div>
    </section>
  )
}
