'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useAuth } from '@/lib/auth'
import { useToast } from '@/components/ui/use-toast'
import { DollarSign, Users, LinkIcon, TrendingUp, Sparkles, CheckCircle2 } from 'lucide-react'

export default function AffiliatesPage() {
  const { session } = useAuth()
  const router = useRouter()
  const { toast } = useToast()
  const [applying, setApplying] = useState(false)
  const [form, setForm] = useState({ payout_email: '', how_promote: '' })
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
        body: JSON.stringify(form)
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
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/20">
      <div className="max-w-5xl mx-auto px-4 py-20">
        {/* Hero */}
        <div className="text-center mb-20">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
            <Sparkles className="w-4 h-4" />
            Join Our Affiliate Program
          </div>
          <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
            Earn 25% Commission
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Partner with WorkersCraft and earn generous commissions for every customer you refer. Simple, transparent, and rewarding.
          </p>
          <Button size="lg" className="text-lg px-8 py-6 shadow-lg hover:shadow-xl transition-shadow" onClick={() => setShowForm(true)}>
            Start Earning Today
          </Button>
        </div>

        {/* Stats Highlight */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-20">
          <Card className="border-2 hover:border-primary/50 transition-colors">
            <CardContent className="pt-6 text-center">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <DollarSign className="w-6 h-6 text-primary" />
              </div>
              <div className="text-3xl font-bold mb-2">25%</div>
              <p className="text-sm text-muted-foreground">Commission Rate</p>
            </CardContent>
          </Card>
          <Card className="border-2 hover:border-primary/50 transition-colors">
            <CardContent className="pt-6 text-center">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <TrendingUp className="w-6 h-6 text-primary" />
              </div>
              <div className="text-3xl font-bold mb-2">$20</div>
              <p className="text-sm text-muted-foreground">Minimum Payout</p>
            </CardContent>
          </Card>
          <Card className="border-2 hover:border-primary/50 transition-colors">
            <CardContent className="pt-6 text-center">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Users className="w-6 h-6 text-primary" />
              </div>
              <div className="text-3xl font-bold mb-2">24h</div>
              <p className="text-sm text-muted-foreground">Approval Time</p>
            </CardContent>
          </Card>
        </div>

        {/* How it works */}
        <div className="mb-20">
          <h2 className="text-3xl font-bold text-center mb-12">How It Works</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="relative">
              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-2xl font-bold mb-4">
                  1
                </div>
                <LinkIcon className="w-8 h-8 text-primary mb-3" />
                <h3 className="font-semibold text-lg mb-2">Get Your Link</h3>
                <p className="text-sm text-muted-foreground">Apply and receive your unique referral link within 24 hours</p>
              </div>
            </div>
            <div className="relative">
              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-2xl font-bold mb-4">
                  2
                </div>
                <Users className="w-8 h-8 text-primary mb-3" />
                <h3 className="font-semibold text-lg mb-2">Share & Promote</h3>
                <p className="text-sm text-muted-foreground">Share with your audience through any channel you prefer</p>
              </div>
            </div>
            <div className="relative">
              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-2xl font-bold mb-4">
                  3
                </div>
                <DollarSign className="w-8 h-8 text-primary mb-3" />
                <h3 className="font-semibold text-lg mb-2">Earn Commission</h3>
                <p className="text-sm text-muted-foreground">Get 25% of every payment from your referred customers</p>
              </div>
            </div>
          </div>
        </div>

        {/* Benefits */}
        <Card className="bg-muted/50 border-2">
          <CardContent className="pt-8 pb-8">
            <h2 className="text-2xl font-bold text-center mb-8">Why Join?</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto">
              {[
                'Generous 25% commission on all sales',
                'Fast approval within 24 hours',
                'Real-time tracking dashboard',
                'Monthly PayPal payouts',
                'No hidden fees or charges',
                'Dedicated affiliate support'
              ].map((benefit, i) => (
                <div key={i} className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <span className="text-sm">{benefit}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Apply Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Apply to the Affiliate Program</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleApply} className="space-y-4 mt-2">
            <div className="space-y-2">
              <Label>Email Address</Label>
              <input
                type="email"
                placeholder="your@email.com"
                value={form.payout_email}
                onChange={e => setForm(f => ({ ...f, payout_email: e.target.value }))}
                required
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>
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
