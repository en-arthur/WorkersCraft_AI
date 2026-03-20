'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function UsageCard() {
  const [usage, setUsage] = useState<{ count: number; limit: number | null; plan: string } | null>(null)

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) return

      const fetchUsage = () =>
        fetch('/api/usage', { headers: { Authorization: `Bearer ${session.access_token}` } })
          .then(r => r.json())
          .then(data => { if (!data.error) setUsage(data) })

      fetchUsage()

      channel = supabase
        .channel('projects-usage')
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'projects',
          filter: `user_id=eq.${session.user.id}`,
        }, fetchUsage)
        .subscribe()
    })

    return () => { channel && supabase.removeChannel(channel) }
  }, [])

  if (!usage || !usage.plan) return null

  const { count, limit, plan } = usage
  const isUnlimited = limit === null
  const pct = isUnlimited ? 0 : Math.min((count / limit!) * 100, 100)
  const barColor = pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-yellow-500' : 'bg-primary'

  return (
    <div className="p-5 rounded-xl border bg-muted/40 mb-6">
      <div className="flex items-center justify-between mb-3">
        <p className="font-semibold text-sm">📊 Usage — <span className="capitalize">{plan}</span> Plan</p>
        <p className="text-xs text-muted-foreground">Resets daily</p>
      </div>
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span>Projects today</span>
          <span className="font-medium">{count}{isUnlimited ? ' (unlimited)' : ` / ${limit}`}</span>
        </div>
        {!isUnlimited && (
          <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
            <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${pct}%` }} />
          </div>
        )}
      </div>
    </div>
  )
}
