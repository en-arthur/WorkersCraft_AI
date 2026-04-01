'use client'

import { projectTemplates } from '@/lib/project-templates'
import { Button } from '@/components/ui/button'
import { ArrowRight } from 'lucide-react'
import Link from 'next/link'

const platformBadges = {
  web: { label: 'Web', color: 'bg-blue-500/10 text-blue-600 border-blue-500/20' },
  mobile: { label: 'Mobile', color: 'bg-green-500/10 text-green-600 border-green-500/20' },
  data: { label: 'Data', color: 'bg-purple-500/10 text-purple-600 border-purple-500/20' },
}

export function Templates() {
  return (
    <section className="py-28 px-4 relative overflow-hidden">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute top-1/2 left-1/4 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-purple-500/10 blur-[120px]" />
        <div className="absolute top-1/2 right-1/4 translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-blue-500/10 blur-[120px]" />
      </div>

      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <span className="inline-flex items-center gap-2 px-3 py-1 mb-6 rounded-full border border-border/60 bg-muted/40 text-xs font-medium text-muted-foreground tracking-wide uppercase">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" />
            Templates
          </span>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight mb-4">
            Start with a template
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Choose from pre-built examples and customize to your needs
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projectTemplates.map((template) => {
            const badge = platformBadges[template.platform]
            return (
              <Link
                key={template.id}
                href={`/auth?redirect=/chat?template=${template.id}`}
                className="group relative rounded-2xl border border-border/60 bg-card/50 p-6 hover:border-primary/50 hover:bg-card/80 transition-all duration-300 hover:shadow-lg hover:shadow-primary/10 hover:-translate-y-1"
              >
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                  <template.icon className="w-6 h-6 text-primary" />
                </div>

                <div className="mb-3">
                  <span className={`inline-flex items-center px-2 py-1 rounded-md border text-xs font-medium ${badge.color}`}>
                    {badge.label}
                  </span>
                </div>

                <h3 className="text-lg font-semibold mb-2 group-hover:text-primary transition-colors">
                  {template.name}
                </h3>
                <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                  {template.description}
                </p>

                <div className="flex items-center gap-2 text-sm font-medium text-primary">
                  Use template
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>

                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary/0 via-primary/0 to-purple-500/0 group-hover:from-primary/5 group-hover:to-purple-500/5 transition-all duration-300 -z-10" />
              </Link>
            )
          })}
        </div>

        <div className="text-center mt-12">
          <p className="text-sm text-muted-foreground mb-4">
            Or start from scratch with your own idea
          </p>
          <Link href="/auth">
            <Button size="lg" variant="outline" className="gap-2">
              Start Building
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  )
}
