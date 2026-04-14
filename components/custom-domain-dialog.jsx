'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, Globe, CheckCircle2, AlertCircle, Copy, ExternalLink } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/components/ui/use-toast'

export function CustomDomainDialog({ projectId, currentDomain, onDomainAdded }) {
  const { toast } = useToast()
  const [isOpen, setIsOpen] = useState(false)
  const [domain, setDomain] = useState('')
  const [isAdding, setIsAdding] = useState(false)
  const [isChecking, setIsChecking] = useState(false)
  const [domainStatus, setDomainStatus] = useState(null)
  const [dnsRecords, setDnsRecords] = useState([])

  useEffect(() => {
    if (isOpen && currentDomain) {
      checkDomainStatus()
    }
  }, [isOpen, currentDomain])

  async function checkDomainStatus() {
    try {
      setIsChecking(true)
      const { data: { session } } = await supabase.auth.getSession()
      
      const response = await fetch(`/api/projects/${projectId}/domain`, {
        headers: { 'Authorization': `Bearer ${session?.access_token}` }
      })

      if (response.ok) {
        const data = await response.json()
        setDomainStatus(data)
        setDnsRecords(data.dnsRecords || [])
      }
    } catch (error) {
      console.error('Error checking domain:', error)
    } finally {
      setIsChecking(false)
    }
  }

  async function handleAddDomain() {
    if (!domain.trim()) return

    try {
      setIsAdding(true)
      const { data: { session } } = await supabase.auth.getSession()

      const response = await fetch(`/api/projects/${projectId}/domain`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({ domain: domain.trim() })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to add domain')
      }

      setDomainStatus(data)
      setDnsRecords(data.dnsRecords || [])
      
      if (data.verified) {
        toast({
          title: '✅ Domain verified!',
          description: `${domain} is now connected to your project.`
        })
        onDomainAdded?.(domain)
      } else {
        toast({
          title: '⏳ Domain added',
          description: 'Configure DNS records to verify your domain.'
        })
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Failed to add domain',
        description: error.message
      })
    } finally {
      setIsAdding(false)
    }
  }

  async function handleRemoveDomain() {
    try {
      const { data: { session } } = await supabase.auth.getSession()

      const response = await fetch(`/api/projects/${projectId}/domain`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${session?.access_token}` }
      })

      if (response.ok) {
        setDomainStatus(null)
        setDnsRecords([])
        setDomain('')
        toast({ title: 'Domain removed' })
        onDomainAdded?.(null)
        setIsOpen(false)
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Failed to remove domain',
        description: error.message
      })
    }
  }

  function copyToClipboard(text) {
    navigator.clipboard.writeText(text)
    toast({ title: 'Copied to clipboard' })
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Globe className="w-4 h-4" />
          {currentDomain || 'Custom Domain'}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Custom Domain</DialogTitle>
          <DialogDescription>
            Connect your own domain to this project
          </DialogDescription>
        </DialogHeader>

        {!currentDomain && !domainStatus ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="domain">Domain Name</Label>
              <Input
                id="domain"
                placeholder="myapp.com"
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                disabled={isAdding}
              />
              <p className="text-xs text-muted-foreground">
                Enter your domain without http:// or www
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Domain Status */}
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-3">
                <Globe className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">{domainStatus?.domain || currentDomain}</p>
                  <div className="flex items-center gap-2 mt-1">
                    {isChecking ? (
                      <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                    ) : domainStatus?.verified ? (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                        <span className="text-sm text-green-600">Verified</span>
                      </>
                    ) : (
                      <>
                        <AlertCircle className="w-4 h-4 text-orange-500" />
                        <span className="text-sm text-orange-600">Pending verification</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={checkDomainStatus}
                disabled={isChecking}
              >
                {isChecking ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Refresh'}
              </Button>
            </div>

            {/* DNS Instructions */}
            {!domainStatus?.verified && dnsRecords.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-start gap-2 p-3 bg-muted/50 rounded-lg">
                  <AlertCircle className="w-5 h-5 text-orange-500 mt-0.5" />
                  <div className="flex-1 text-sm">
                    <p className="font-medium mb-1">Configure DNS Records</p>
                    <p className="text-muted-foreground">
                      Add these records at your domain registrar (Namecheap, GoDaddy, Cloudflare, etc.)
                    </p>
                  </div>
                </div>

                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/40">
                      <tr>
                        <th className="text-left p-3 font-medium">Type</th>
                        <th className="text-left p-3 font-medium">Name</th>
                        <th className="text-left p-3 font-medium">Value</th>
                        <th className="w-12"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {dnsRecords.map((record, i) => (
                        <tr key={i} className="border-t">
                          <td className="p-3 font-mono">{record.type}</td>
                          <td className="p-3 font-mono">{record.name}</td>
                          <td className="p-3 font-mono text-xs">{record.value}</td>
                          <td className="p-3">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => copyToClipboard(record.value)}
                            >
                              <Copy className="w-3 h-3" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <p className="text-xs text-muted-foreground">
                  DNS changes can take up to 48 hours to propagate, but usually complete within a few minutes.
                </p>
              </div>
            )}

            {domainStatus?.verified && (
              <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900 rounded-lg">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-green-900 dark:text-green-100">
                    Domain is live!
                  </p>
                  <a
                    href={`https://${domainStatus.domain}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-green-700 dark:text-green-300 hover:underline flex items-center gap-1"
                  >
                    Visit {domainStatus.domain} <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          {domainStatus || currentDomain ? (
            <>
              <Button variant="outline" onClick={() => setIsOpen(false)}>
                Close
              </Button>
              <Button variant="destructive" onClick={handleRemoveDomain}>
                Remove Domain
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => setIsOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddDomain} disabled={isAdding || !domain.trim()}>
                {isAdding && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Add Domain
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
