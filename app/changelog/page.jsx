import { changelog } from '@/lib/changelog'
import { LandingNav } from '@/components/landing/landing-nav'

const typeBadge = {
  new:         'bg-green-500/10 text-green-400 border border-green-500/20',
  improvement: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
  fix:         'bg-orange-500/10 text-orange-400 border border-orange-500/20',
}

export const metadata = {
  title: 'Changelog — WorkersCraft AI',
  description: 'Latest updates and improvements to WorkersCraft AI',
}

export default function ChangelogPage() {
  return (
    <>
      <LandingNav />

      <main className="min-h-screen bg-background">

        {/* ── Hero ──────────────────────────────────────────────── */}
        <section className="relative pt-40 pb-16 px-4 overflow-hidden">
          {/* Ambient glow */}
          <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
            <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full bg-blue-500/10 blur-[120px]" />
          </div>

          <div className="max-w-2xl mx-auto">
            {/* Eyebrow */}
            <span className="inline-flex items-center gap-2 px-3 py-1 mb-6 rounded-full border border-border/60 bg-muted/40 text-xs font-medium text-muted-foreground tracking-wide uppercase">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
              What&apos;s new
            </span>

            <h1 className="text-4xl sm:text-5xl font-bold tracking-tight leading-tight mb-3">
              Changelog
            </h1>
            <p className="text-muted-foreground text-base sm:text-lg">
              New updates and improvements to WorkersCraft AI.
            </p>
          </div>
        </section>

        {/* ── Timeline ──────────────────────────────────────────── */}
        <section className="px-4 pb-28">
          <div className="max-w-2xl mx-auto">
            <div className="space-y-0">
              {changelog.map((release, idx) => (
                <div key={release.version} className="relative flex gap-6 sm:gap-8">

                  {/* Timeline spine + dot */}
                  <div className="flex flex-col items-center">
                    <div className="mt-5 w-2.5 h-2.5 rounded-full bg-border border-2 border-background ring-2 ring-border shrink-0 z-10" />
                    {idx < changelog.length - 1 && (
                      <div className="w-px flex-1 bg-border/50 mt-1" />
                    )}
                  </div>

                  {/* Card */}
                  <div className="flex-1 pb-10">
                    {/* Release header */}
                    <div className="flex items-center gap-3 mb-4 mt-3">
                      <span className="text-sm font-bold tabular-nums">
                        v{release.version}
                      </span>
                      <span className="text-xs text-muted-foreground">{release.date}</span>
                      {idx === 0 && (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                          Latest
                        </span>
                      )}
                    </div>

                    {/* Changes */}
                    <div className="rounded-2xl border border-border/60 bg-card/50 backdrop-blur-sm divide-y divide-border/40 overflow-hidden">
                      {release.changes.map((change, i) => (
                        <div
                          key={i}
                          className="flex items-start gap-3 px-5 py-3.5"
                        >
                          <span
                            className={`shrink-0 mt-0.5 text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize leading-none pt-[3px] pb-[3px] ${typeBadge[change.type] ?? 'bg-muted text-muted-foreground border border-border'}`}
                          >
                            {change.type}
                          </span>
                          <p className="text-sm leading-relaxed text-foreground/90">
                            {change.text}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                </div>
              ))}
            </div>
          </div>
        </section>

      </main>

    </>
  )
}