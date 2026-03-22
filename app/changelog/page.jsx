import { changelog } from '@/lib/changelog'
import { LandingNav } from '@/components/landing/landing-nav'

const typeBadge = {
  new: 'bg-green-500/10 text-green-400 border border-green-500/20',
  improvement: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
  fix: 'bg-orange-500/10 text-orange-400 border border-orange-500/20',
}

export const metadata = {
  title: 'Changelog — WorkersCraft AI',
  description: 'Latest updates and improvements to WorkersCraft AI',
}

export default function ChangelogPage() {
  return (
    <>
      <LandingNav />
      <main className="max-w-2xl mx-auto px-4 pt-28 pb-20">
        <h1 className="text-3xl font-bold mb-2">Changelog</h1>
        <p className="text-muted-foreground mb-12">New updates and improvements.</p>

        <div className="space-y-12">
          {changelog.map((release) => (
            <div key={release.version} className="flex gap-6">
              <div className="w-28 shrink-0 text-right">
                <p className="text-xs text-muted-foreground">{release.date}</p>
                <p className="text-sm font-semibold mt-0.5">v{release.version}</p>
              </div>
              <div className="flex-1 border-l pl-6 space-y-3">
                {release.changes.map((change, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full shrink-0 mt-0.5 capitalize ${typeBadge[change.type]}`}>
                      {change.type}
                    </span>
                    <p className="text-sm">{change.text}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </main>
    </>
  )
}
