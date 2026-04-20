'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/components/ui/use-toast'
import { DollarSign, Users, LinkIcon, Clock, CheckCircle2, Sparkles, TrendingUp } from 'lucide-react'

export default function AffiliatesPage() {
  const [session, setSession] = useState(null)
  const router = useRouter()

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
  }, [])
  const { toast } = useToast()
  const [applying, setApplying] = useState(false)
  const [form, setForm] = useState({ payout_email: '', how_promote: '' })
  const [showForm, setShowForm] = useState(false)

  async function handleApply(e) {
    e.preventDefault()
    if (!session?.access_token) { router.push('/auth'); return }
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
      toast({ title: 'Application submitted!', description: "We'll review and approve you within 1–2 hours." })
      router.push('/dashboard/affiliates')
    } catch (err) {
      toast({ variant: 'destructive', title: 'Error', description: err.message })
    } finally {
      setApplying(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-6 py-24 space-y-24">

        {/* Hero */}
        <div className="text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-medium">
            <Sparkles className="w-3.5 h-3.5" />
            Affiliate Program
          </div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
            Earn on every sale
          </h1>
          <p className="text-muted-foreground text-base max-w-lg mx-auto leading-relaxed">
            Partner with WorkersCraft and earn recurring commissions for every customer you refer. Simple, transparent, rewarding.
          </p>
          <div className="pt-2">
            <Button size="lg" className="px-10 whitespace-nowrap" onClick={() => setShowForm(true)}>
              Start Earning
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { icon: DollarSign, value: 'Earn', label: 'Commission Rate' },
            { icon: TrendingUp, value: '$20', label: 'Minimum Payout' },
            { icon: Clock, value: '1–2h', label: 'Approval Time' },
          ].map(({ icon: Icon, value, label }) => (
            <div key={label} className="rounded-xl border bg-muted/30 p-5 text-center space-y-2">
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center mx-auto">
                <Icon className="w-4 h-4 text-primary" />
              </div>
              <div className="text-2xl font-bold">{value}</div>
              <p className="text-xs text-muted-foreground">{label}</p>
            </div>
          ))}
        </div>

        {/* How it works */}
        <div className="space-y-10">
          <h2 className="text-xl font-semibold text-center">How It Works</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {[
              { step: '1', icon: LinkIcon, title: 'Get Your Link', desc: 'Apply and receive your unique referral link within 1–2 hours.' },
              { step: '2', icon: Users, title: 'Share & Promote', desc: 'Share with your audience through any channel you prefer.' },
              { step: '3', icon: DollarSign, title: 'Earn Commission', desc: 'Get commission on every monthly payment from your referred customers.' },
            ].map(({ step, icon: Icon, title, desc }) => (
              <div key={step} className="rounded-xl border p-6 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold shrink-0">
                    {step}
                  </div>
                  <Icon className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm mb-1.5">{title}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Benefits */}
        <div className="rounded-xl border bg-muted/20 p-8 space-y-6">
          <h2 className="text-lg font-semibold text-center">Why Join?</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-lg mx-auto">
            {[
              'Commission on all monthly sales',
              'Fast approval within 1–2 hours',
              'Real-time tracking dashboard',
              'Monthly payouts',
              'No hidden fees or charges',
              'Dedicated partner support',
            ].map((benefit) => (
              <div key={benefit} className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <span className="text-sm">{benefit}</span>
              </div>
            ))}
          </div>
          <div className="text-center pt-2">
            <Button onClick={() => setShowForm(true)} className="px-8">Apply Now</Button>
          </div>
        </div>
      </div>

      {/* Apply Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-sm w-full">
          <DialogHeader>
            <DialogTitle className="text-base">Apply to Affiliate Program</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleApply} className="space-y-4 mt-1">
            <div className="space-y-1.5">
              <Label className="text-xs">Payout Email</Label>
              <input
                type="email"
                placeholder="your@email.com"
                value={form.payout_email}
                onChange={e => setForm(f => ({ ...f, payout_email: e.target.value }))}
                required
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">How will you promote WorkersCraft?</Label>
              <Textarea
                placeholder="e.g. YouTube, Twitter, blog, newsletter..."
                value={form.how_promote}
                onChange={e => setForm(f => ({ ...f, how_promote: e.target.value }))}
                required
                rows={3}
                className="text-sm resize-none"
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
