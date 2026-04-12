'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useToast } from '@/components/ui/use-toast'
import { Loader2 } from 'lucide-react'

export default function AdminAffiliatesPage() {
  const { toast } = useToast()
  const [affiliates, setAffiliates] = useState([])
  const [loading, setLoading] = useState(true)
  const [authenticated, setAuthenticated] = useState(false)
  const [credentials, setCredentials] = useState({ username: '', password: '' })
  const [actionLoading, setActionLoading] = useState(null)
  const [rejectDialog, setRejectDialog] = useState(null) // { payout_request_id }
  const [rejectNotes, setRejectNotes] = useState('')

  useEffect(() => {
    const stored = localStorage.getItem('admin_auth')
    if (stored) {
      const creds = JSON.parse(stored)
      setCredentials(creds)
      setAuthenticated(true)
      fetchAffiliates(creds)
    } else {
      setLoading(false)
    }
  }, [])

  function getAuthHeader(creds) {
    return 'Basic ' + btoa(`${creds.username}:${creds.password}`)
  }

  async function handleLogin(e) {
    e.preventDefault()
    setLoading(true)
    const res = await fetch('/api/affiliates/admin', {
      headers: { 'Authorization': getAuthHeader(credentials) }
    })
    if (res.ok) {
      localStorage.setItem('admin_auth', JSON.stringify(credentials))
      setAuthenticated(true)
      const data = await res.json()
      setAffiliates(data.affiliates || [])
      setLoading(false)
    } else {
      toast({ variant: 'destructive', title: 'Invalid credentials' })
      setLoading(false)
    }
  }

  async function fetchAffiliates(creds = credentials) {
    const res = await fetch('/api/affiliates/admin', {
      headers: { 'Authorization': getAuthHeader(creds) }
    })
    const data = await res.json()
    setAffiliates(data.affiliates || [])
    setLoading(false)
  }

  async function patch(body) {
    const res = await fetch('/api/affiliates/admin', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'Authorization': getAuthHeader(credentials) },
      body: JSON.stringify(body)
    })
    return res.ok
  }

  async function updateAffiliateStatus(affiliate_id, status) {
    setActionLoading(affiliate_id + status)
    const ok = await patch({ affiliate_id, status })
    if (ok) toast({ title: `Affiliate ${status}` })
    else toast({ variant: 'destructive', title: 'Action failed' })
    setActionLoading(null)
    fetchAffiliates()
  }

  async function handlePayoutAction(payout_request_id, payout_action, notes = '') {
    setActionLoading(payout_request_id + payout_action)
    const ok = await patch({ payout_request_id, payout_action, notes })
    if (ok) toast({ title: `Payout ${payout_action}` })
    else toast({ variant: 'destructive', title: 'Action failed' })
    setActionLoading(null)
    setRejectDialog(null)
    setRejectNotes('')
    fetchAffiliates()
  }

  const payoutStatusVariant = (s) => ({ pending: 'secondary', approved: 'default', paid: 'default', rejected: 'destructive' }[s] || 'secondary')

  if (!authenticated) {
    return (
      <div className="p-8 max-w-md mx-auto">
        <Card>
          <CardHeader><CardTitle>Admin Login</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label>Username</Label>
                <Input value={credentials.username} onChange={e => setCredentials(c => ({ ...c, username: e.target.value }))} required />
              </div>
              <div className="space-y-2">
                <Label>Password</Label>
                <Input type="password" value={credentials.password} onChange={e => setCredentials(c => ({ ...c, password: e.target.value }))} required />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Logging in...' : 'Login'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (loading) return <div className="p-8 text-center text-muted-foreground">Loading...</div>

  // Collect all pending payout requests across affiliates for the top summary
  const pendingPayouts = affiliates.flatMap(a =>
    (a.payout_requests || []).filter(r => r.status === 'pending').map(r => ({ ...r, affiliate: a }))
  )

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-8">
      <h1 className="text-2xl font-bold">Affiliate Management</h1>

      {/* Pending payout requests — shown at top for quick action */}
      {pendingPayouts.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-base font-semibold text-orange-600 dark:text-orange-400">
            Pending Payout Requests ({pendingPayouts.length})
          </h2>
          {pendingPayouts.map(r => (
            <Card key={r.id} className="border-orange-200 dark:border-orange-800">
              <CardContent className="pt-4">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div className="space-y-0.5">
                    <p className="font-medium text-sm">{r.affiliate.payout_email}</p>
                    <p className="text-xs text-muted-foreground">
                      Amount: <span className="font-semibold text-foreground">${(r.amount_cents / 100).toFixed(2)}</span>
                      {' · '}Requested: {new Date(r.requested_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      disabled={actionLoading === r.id + 'paid'}
                      onClick={() => handlePayoutAction(r.id, 'paid')}
                    >
                      {actionLoading === r.id + 'paid' && <Loader2 className="w-3 h-3 mr-1 animate-spin" />}
                      Mark Paid
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => { setRejectDialog({ payout_request_id: r.id }); setRejectNotes('') }}
                    >
                      Reject
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* All affiliates */}
      {affiliates.length === 0 && <p className="text-muted-foreground">No affiliates yet.</p>}

      {affiliates.map(a => (
        <Card key={a.id}>
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <CardTitle className="text-base">{a.email || a.payout_email}</CardTitle>
                <p className="text-sm text-muted-foreground">ref: <code>{a.ref_code}</code></p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant={a.status === 'approved' ? 'default' : a.status === 'pending' ? 'secondary' : 'destructive'}>
                  {a.status}
                </Badge>
                {a.status === 'pending' && (
                  <>
                    <Button size="sm" disabled={actionLoading === a.id + 'approved'} onClick={() => updateAffiliateStatus(a.id, 'approved')}>
                      {actionLoading === a.id + 'approved' && <Loader2 className="w-3 h-3 mr-1 animate-spin" />}
                      Approve
                    </Button>
                    <Button size="sm" variant="destructive" disabled={actionLoading === a.id + 'rejected'} onClick={() => updateAffiliateStatus(a.id, 'rejected')}>
                      Reject
                    </Button>
                  </>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
              <div><span className="text-muted-foreground">Clicks:</span> {a.clicks}</div>
              <div><span className="text-muted-foreground">Conversions:</span> {a.conversions}</div>
              <div><span className="text-muted-foreground">Pending:</span> ${a.pending_earnings?.toFixed(2)}</div>
              <div><span className="text-muted-foreground">Paid:</span> ${a.total_paid?.toFixed(2)}</div>
            </div>
            {a.how_promote && <p className="text-xs text-muted-foreground italic">{a.how_promote}</p>}

            {/* Payout request history for this affiliate */}
            {a.payout_requests?.length > 0 && (
              <div className="pt-2 border-t space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Payout Requests</p>
                {a.payout_requests.map(r => (
                  <div key={r.id} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <Badge variant={payoutStatusVariant(r.status)}>{r.status}</Badge>
                      <span className="font-medium">${(r.amount_cents / 100).toFixed(2)}</span>
                      <span className="text-muted-foreground">{new Date(r.requested_at).toLocaleDateString()}</span>
                      {r.notes && <span className="text-muted-foreground">— {r.notes}</span>}
                    </div>
                    {r.status === 'pending' && (
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" disabled={actionLoading === r.id + 'paid'} onClick={() => handlePayoutAction(r.id, 'paid')}>
                          Mark Paid
                        </Button>
                        <Button size="sm" variant="ghost" className="text-destructive" onClick={() => { setRejectDialog({ payout_request_id: r.id }); setRejectNotes('') }}>
                          Reject
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      ))}

      {/* Reject dialog */}
      <Dialog open={!!rejectDialog} onOpenChange={() => setRejectDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Payout Request</DialogTitle>
            <DialogDescription>Optionally add a note explaining why it was rejected.</DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Reason (optional)"
            value={rejectNotes}
            onChange={e => setRejectNotes(e.target.value)}
            rows={3}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialog(null)}>Cancel</Button>
            <Button
              variant="destructive"
              disabled={actionLoading === rejectDialog?.payout_request_id + 'rejected'}
              onClick={() => handlePayoutAction(rejectDialog.payout_request_id, 'rejected', rejectNotes)}
            >
              {actionLoading === rejectDialog?.payout_request_id + 'rejected' && <Loader2 className="w-3 h-3 mr-1 animate-spin" />}
              Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
