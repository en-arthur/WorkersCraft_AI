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

export default function TemplatesPage() {
  return (
    <div className="p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Project Templates</h1>
          <p className="text-muted-foreground">
            Start with a pre-built template and customize it to your needs
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projectTemplates.map((template) => {
            const badge = platformBadges[template.platform]
            return (
              <Link
                key={template.id}
                href={`/chat?template=${template.id}`}
                className="group relative rounded-2xl border border-border/60 bg-card p-6 hover:border-primary/50 hover:bg-card/80 transition-all duration-300 hover:shadow-lg hover:shadow-primary/10 hover:-translate-y-1"
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
              </Link>
            )
          })}
        </div>

        <div className="text-center mt-12">
          <p className="text-sm text-muted-foreground mb-4">
            Want to start from scratch?
          </p>
          <Link href="/chat">
            <Button size="lg" variant="outline" className="gap-2">
              New Project
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
