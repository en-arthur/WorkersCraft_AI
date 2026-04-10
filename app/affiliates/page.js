'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useAuth } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/components/ui/use-toast'
import { DollarSign, Users, LinkIcon, BarChart3 } from 'lucide-react'

export default function AffiliatesPage() {
  const { session } = useAuth()
  const router = useRouter()
  const { toast } = useToast()
  const [applying, setApplying] = useState(false)
  const [form, setForm] = useState({ how_promote: '' })
  const [showForm, setShowForm] = useState(false)

  async function handleApply(e) {
    e.preventDefault()
    if (!session) { router.push('/auth'); return }
    setApplying(true)
    try {
      const res = await fetch('/api/affiliates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ payout_email: session.user.email, how_promote: form.how_promote })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast({ title: 'Application submitted!', description: "We will review and approve you within 24 hours." })
      router.push('/dashboard/affiliates')
    } catch (err) {
      toast({ variant: 'destructive', title: 'Error', description: err.message })
    } finally {
      setApplying(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-20">
        {/* Hero */}
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold mb-4">Earn 25% Commission</h1>
          <p className="text-xl text-muted-foreground mb-8">
            Join the WorkersCraft affiliate program and earn for every paying customer you refer.
          </p>
          <Button size="lg" onClick={() => setShowForm(true)}>
            Apply Now &mdash; It&apos;s Free
          </Button>
        </div>

        {/* How it works */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
          <Card>
            <CardContent className="pt-6 text-center">
              <LinkIcon className="w-8 h-8 mx-auto mb-3 text-primary" />
              <h3 className="font-semibold mb-1">1. Get your link</h3>
              <p className="text-sm text-muted-foreground">Get a unique referral link after approval</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center">
              <Users className="w-8 h-8 mx-auto mb-3 text-primary" />
              <h3 className="font-semibold mb-1">2. Share it</h3>
              <p className="text-sm text-muted-foreground">Share with your audience, community, or clients</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center">
              <DollarSign className="w-8 h-8 mx-auto mb-3 text-primary" />
              <h3 className="font-semibold mb-1">3. Earn 25%</h3>
              <p className="text-sm text-muted-foreground">Earn 25% of every payment from referred users</p>
            </CardContent>
          </Card>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 mb-16 text-center max-w-xs mx-auto">
          {[
            { label: 'Commission', value: '25%' },
            { label: 'Min. Payout', value: '$20' },
          ].map(({ label, value }) => (
            <div key={label} className="p-4 border rounded-lg">
              <div className="text-2xl font-bold text-primary">{value}</div>
              <div className="text-sm text-muted-foreground">{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Apply Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Apply to the Affiliate Program</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleApply} className="space-y-4 mt-2">
            <div className="space-y-2">
              <Label>How will you promote WorkersCraft?</Label>
              <Textarea
                placeholder="e.g. YouTube channel, Twitter audience, blog, newsletter..."
                value={form.how_promote}
                onChange={e => setForm(f => ({ ...f, how_promote: e.target.value }))}
                required
                rows={3}
              />
            </div>
            <Button type="submit" className="w-full" disabled={applying}>
              {applying ? 'Submitting...' : 'Submit Application'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
