'use client'
import { useEffect, useState, useCallback, useRef } from 'react'
import { createClient } from '@supabase/supabase-js'
import { BarChart2 } from 'lucide-react'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function UsageCard() {
  const [usage, setUsage] = useState<{ count: number; limit: number | null; plan: string; label?: string } | null>(null)
  const tokenRef = useRef<string | null>(null)

  const fetchUsage = useCallback(async () => {
    const token = tokenRef.current
    if (!token) return
    const res = await fetch('/api/usage', { headers: { Authorization: `Bearer ${token}` } })
    const data = await res.json()
    if (!data.error) setUsage(data)
  }, [])

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) return
      tokenRef.current = session.access_token

      fetchUsage()

      // Realtime: update when a new project is inserted
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

    // Re-fetch when user returns to this tab
    const onVisible = () => { if (document.visibilityState === 'visible') fetchUsage() }
    document.addEventListener('visibilitychange', onVisible)

    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      if (channel) supabase.removeChannel(channel)
    }
  }, [fetchUsage])

  if (!usage || !usage.plan) return null

  const { count, limit, plan, label } = usage
  const isUnlimited = limit === null
  const pct = isUnlimited ? 0 : Math.min((count / limit!) * 100, 100)
  const barColor = pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-yellow-500' : 'bg-primary'

  return (
    <div className="p-5 rounded-xl border bg-muted/40 mb-6">
      <div className="flex items-center justify-between mb-3">
        <p className="font-semibold text-sm flex items-center gap-1.5"><BarChart2 className="w-4 h-4" /> Usage — <span className="capitalize">{plan}</span> Plan</p>
        <p className="text-xs text-muted-foreground"></p>
      </div>
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span>{label || 'Projects this month'}</span>
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
