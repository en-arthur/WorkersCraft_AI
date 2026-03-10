import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowRight } from 'lucide-react'

export function CTA() {
  return (
    <section className="py-24 px-4">
      <div className="max-w-4xl mx-auto text-center">
        <h2 className="text-3xl md:text-5xl font-bold mb-6">
          Ready to Build?
        </h2>
        <p className="text-xl text-muted-foreground mb-10">
          Start creating amazing applications with WorkersCraft AI today.
        </p>
        <Link href="/auth">
          <Button size="lg" className="gap-2 px-8 h-12 text-lg">
            Launch App <ArrowRight className="w-5 h-5" />
          </Button>
        </Link>
      </div>
    </section>
  )
}
