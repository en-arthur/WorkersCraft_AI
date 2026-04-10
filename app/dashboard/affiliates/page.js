'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/use-toast'
import { Copy, Check, DollarSign, MousePointer, Users, Clock } from 'lucide-react'

export default function AffiliateDashboard() {
  const { session } = useAuth()
  const router = useRouter()
  const { toast } = useToast()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (session) fetchData()
  }, [session])

  async function fetchData() {
    const res = await fetch('/api/affiliates', {
      headers: { 'Authorization': `Bearer ${session.access_token}` }
    })
    const json = await res.json()
    setData(json)
    setLoading(false)
  }

  function copyLink() {
    const link = `https://www.workerscraft.com?ref=${data.affiliate.ref_code}`
    navigator.clipboard.writeText(link)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (loading) return <div className="p-8 text-center text-muted-foreground">Loading...</div>

  if (!data?.affiliate) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-xl font-semibold mb-2">You're not an affiliate yet</h2>
        <p className="text-muted-foreground mb-4">Apply to join our affiliate program and earn 25% commission.</p>
        <Button onClick={() => router.push('/affiliates')}>Apply Now</Button>
      </div>
    )
  }

  const { affiliate, stats, conversions } = data
  const refLink = `https://www.workerscraft.com?ref=${affiliate.ref_code}`

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Affiliate Dashboard</h1>
        <Badge variant={affiliate.status === 'approved' ? 'default' : affiliate.status === 'pending' ? 'secondary' : 'destructive'}>
          {affiliate.status}
        </Badge>
      </div>

      {affiliate.status === 'pending' && (
        <div className="p-4 bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg text-sm text-yellow-800 dark:text-yellow-200">
          Your application is under review. We'll approve you within 24 hours.
        </div>
      )}

      {affiliate.status === 'approved' && (
        <>
          {/* Ref link */}
          <Card>
            <CardHeader><CardTitle className="text-base">Your Referral Link</CardTitle></CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <code className="flex-1 bg-muted px-3 py-2 rounded text-sm truncate">{refLink}</code>
                <Button size="sm" variant="outline" onClick={copyLink}>
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Clicks', value: stats.clicks, icon: MousePointer },
              { label: 'Conversions', value: stats.conversions, icon: Users },
              { label: 'Pending Earnings', value: `$${stats.pending_earnings.toFixed(2)}`, icon: Clock },
              { label: 'Total Paid', value: `$${affiliate.total_paid.toFixed(2)}`, icon: DollarSign },
            ].map(({ label, value, icon: Icon }) => (
              <Card key={label}>
                <CardContent className="pt-4">
                  <Icon className="w-4 h-4 text-muted-foreground mb-2" />
                  <div className="text-2xl font-bold">{value}</div>
                  <div className="text-xs text-muted-foreground">{label}</div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Conversions table */}
          {conversions.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-base">Conversions</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {conversions.map(c => (
                    <div key={c.id} className="flex items-center justify-between py-2 border-b last:border-0 text-sm">
                      <div>
                        <span className="font-medium">{c.plan}</span>
                        <span className="text-muted-foreground ml-2">{new Date(c.created_at).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">${(c.commission_cents / 100).toFixed(2)}</span>
                        <Badge variant={c.status === 'paid' ? 'default' : 'secondary'}>{c.status}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <p className="text-xs text-muted-foreground text-center">
            Payouts are sent manually when your balance reaches $20. Contact us to request a payout.
          </p>
        </>
      )}
    </div>
  )
}
