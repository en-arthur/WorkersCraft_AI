'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/use-toast'

export default function AdminAffiliatesPage() {
  const { toast } = useToast()
  const [affiliates, setAffiliates] = useState([])
  const [loading, setLoading] = useState(true)
  const [authenticated, setAuthenticated] = useState(false)
  const [credentials, setCredentials] = useState({ username: '', password: '' })

  useEffect(() => {
    const stored = localStorage.getItem('admin_auth')
    if (stored) {
      setCredentials(JSON.parse(stored))
      setAuthenticated(true)
      fetchAffiliates(JSON.parse(stored))
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
      fetchAffiliates(credentials)
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

  async function updateStatus(affiliate_id, status) {
    await fetch('/api/affiliates/admin', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'Authorization': getAuthHeader(credentials) },
      body: JSON.stringify({ affiliate_id, status })
    })
    toast({ title: `Affiliate ${status}` })
    fetchAffiliates()
  }

  async function markPaid(conversion_id) {
    await fetch('/api/affiliates/admin', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'Authorization': getAuthHeader(credentials) },
      body: JSON.stringify({ conversion_id, mark_paid: true })
    })
    toast({ title: 'Marked as paid' })
    fetchAffiliates()
  }

  if (!authenticated) {
    return (
      <div className="p-8 max-w-md mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Admin Login</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label>Username</Label>
                <Input
                  value={credentials.username}
                  onChange={e => setCredentials(c => ({ ...c, username: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Password</Label>
                <Input
                  type="password"
                  value={credentials.password}
                  onChange={e => setCredentials(c => ({ ...c, password: e.target.value }))}
                  required
                />
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
