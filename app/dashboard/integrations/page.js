'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useAuth } from '@/lib/auth'
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react'
// import { TelegramIntegration } from '@/components/telegram-integration'
// import { SlackIntegration } from '@/components/slack-integration'

export default function IntegrationsPage() {
  const { session } = useAuth()
  const [vercelToken, setVercelToken] = useState('')
  const [integration, setIntegration] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [dialogMessage, setDialogMessage] = useState({ title: '', description: '', success: false })

  const loadIntegrations = async () => {
    if (!session?.access_token) return
    
    try {
      const res = await fetch('/api/integrations', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      })
      
      if (res.ok) {
        const data = await res.json()
        const vercelIntegration = data.integrations?.find(i => i.integration_type === 'vercel')
        setIntegration(vercelIntegration || null)
      }
    } catch (error) {
      console.error('Failed to load integrations:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadIntegrations()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session])

  async function testConnection() {
    if (!vercelToken || vercelToken.startsWith('•')) return
    
    setTesting(true)
    try {
      const res = await fetch('/api/integrations/vercel/test', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ token: vercelToken })
      })
      
      const data = await res.json()
      if (data.valid) {
        setDialogMessage({ title: 'Success', description: 'Vercel token is valid!', success: true })
      } else {
        setDialogMessage({ title: 'Error', description: 'Invalid Vercel token', success: false })
      }
      setDialogOpen(true)
    } catch (error) {
      setDialogMessage({ title: 'Error', description: 'Failed to test token', success: false })
      setDialogOpen(true)
    } finally {
      setTesting(false)
    }
  }

  async function saveToken() {
    if (!vercelToken || vercelToken.startsWith('•')) return
    
    setSaving(true)
    try {
      const res = await fetch('/api/integrations', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          integration_type: 'vercel',
          access_token: vercelToken
        })
      })
      
      if (res.ok) {
        await loadIntegrations()
        setDialogMessage({ title: 'Success', description: 'Vercel token saved successfully!', success: true })
      } else {
        setDialogMessage({ title: 'Error', description: 'Failed to save token', success: false })
      }
      setDialogOpen(true)
    } catch (error) {
      setDialogMessage({ title: 'Error', description: 'Failed to save token', success: false })
      setDialogOpen(true)
    } finally {
      setSaving(false)
    }
  }

  async function disconnect() {
    if (!integration?.id) return
    
    if (!confirm('Disconnect Vercel integration?')) return
    
    try {
      const res = await fetch(`/api/integrations/${integration.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      })
      
      if (res.ok) {
        setIntegration(null)
        setVercelToken('')
        setDialogMessage({ title: 'Success', description: 'Disconnected successfully', success: true })
      } else {
        setDialogMessage({ title: 'Error', description: 'Failed to disconnect', success: false })
      }
      setDialogOpen(true)
    } catch (error) {
      setDialogMessage({ title: 'Error', description: 'Failed to disconnect', success: false })
      setDialogOpen(true)
    }
  }

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    )
  }

  return (
    <div className="p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">Integrations</h1>
        <p className="text-muted-foreground mb-8">Connect external services to enhance your workflow</p>

        <div className="space-y-4">
          {/* Vercel Integration */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-black dark:bg-white rounded flex items-center justify-center">
                    <span className="text-white dark:text-black font-bold">▲</span>
                  </div>
                  <div>
                    <CardTitle>Vercel</CardTitle>
                    <CardDescription>Deploy your projects to Vercel</CardDescription>
                  </div>
                </div>
                {integration && (
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    <span className="text-green-500">Connected</span>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="vercel-token">Vercel API Token</Label>
                <Input
                  id="vercel-token"
                  type="password"
                  placeholder="Enter your Vercel token"
                  value={vercelToken}
                  onChange={(e) => setVercelToken(e.target.value)}
                  className="mt-1"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Get your token from <a href="https://vercel.com/account/tokens" target="_blank" className="underline">vercel.com/account/tokens</a>
                </p>
              </div>
              
              {integration && (
                <div className="text-sm text-muted-foreground">
                  <p>Connected on {new Date(integration.created_at).toLocaleDateString()}</p>
                  {integration.metadata?.last_used && (
                    <p>Last used: {new Date(integration.metadata.last_used).toLocaleString()}</p>
                  )}
                </div>
              )}
            </CardContent>
            <CardFooter className="flex gap-2">
              <Button onClick={testConnection} disabled={testing || !vercelToken || vercelToken.startsWith('•')} variant="outline">
                {testing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Test Connection
              </Button>
              <Button onClick={saveToken} disabled={saving || !vercelToken || vercelToken.startsWith('•')}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Save Token
              </Button>
              {integration && (
                <Button onClick={disconnect} variant="destructive" className="ml-auto">
                  Disconnect
                </Button>
              )}
            </CardFooter>
          </Card>

          {/* Slack Integration - coming soon */}
          {/* <SlackIntegration session={session} /> */}

          {/* Telegram Integration - coming soon */}
          {/* <TelegramIntegration session={session} /> */}


        </div>

        {/* Status Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {dialogMessage.success ? (
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-500" />
                )}
                {dialogMessage.title}
              </DialogTitle>
              <DialogDescription>
                {dialogMessage.description}
              </DialogDescription>
            </DialogHeader>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
