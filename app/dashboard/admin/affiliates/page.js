'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/use-toast'

export default function AdminAffiliatesPage() {
  const { session } = useAuth()
  const { toast } = useToast()
  const [affiliates, setAffiliates] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (session) fetchAffiliates()
  }, [session])

  async function fetchAffiliates() {
    const res = await fetch('/api/affiliates/admin', {
      headers: { 'Authorization': `Bearer ${session.access_token}` }
    })
    const data = await res.json()
    setAffiliates(data.affiliates || [])
    setLoading(false)
  }

  async function updateStatus(affiliate_id, status) {
    await fetch('/api/affiliates/admin', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
      body: JSON.stringify({ affiliate_id, status })
    })
    toast({ title: `Affiliate ${status}` })
    fetchAffiliates()
  }

  async function markPaid(conversion_id) {
    await fetch('/api/affiliates/admin', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
      body: JSON.stringify({ conversion_id, mark_paid: true })
    })
    toast({ title: 'Marked as paid' })
    fetchAffiliates()
  }

  if (loading) return <div className="p-8 text-center text-muted-foreground">Loading...</div>

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Affiliate Management</h1>

      {affiliates.length === 0 && (
        <p className="text-muted-foreground">No affiliates yet.</p>
      )}

      {affiliates.map(a => (
        <Card key={a.id}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">{a.payout_email}</CardTitle>
                <p className="text-sm text-muted-foreground">ref: <code>{a.ref_code}</code></p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={a.status === 'approved' ? 'default' : a.status === 'pending' ? 'secondary' : 'destructive'}>
                  {a.status}
                </Badge>
                {a.status === 'pending' && (
                  <>
                    <Button size="sm" onClick={() => updateStatus(a.id, 'approved')}>Approve</Button>
                    <Button size="sm" variant="destructive" onClick={() => updateStatus(a.id, 'rejected')}>Reject</Button>
                  </>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-4 text-sm mb-3">
              <div><span className="text-muted-foreground">Clicks:</span> {a.clicks}</div>
              <div><span className="text-muted-foreground">Conversions:</span> {a.conversions}</div>
              <div><span className="text-muted-foreground">Pending:</span> ${a.pending_earnings?.toFixed(2)}</div>
              <div><span className="text-muted-foreground">Paid:</span> ${a.total_paid?.toFixed(2)}</div>
            </div>
            <p className="text-xs text-muted-foreground italic">{a.how_promote}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
