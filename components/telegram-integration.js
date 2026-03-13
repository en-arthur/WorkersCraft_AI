'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { CheckCircle2, XCircle, Loader2, Copy, Check } from 'lucide-react'

export function TelegramIntegration({ session }) {
  const [integration, setIntegration] = useState(null)
  const [loading, setLoading] = useState(true)
  const [verificationCode, setVerificationCode] = useState(null)
  const [generating, setGenerating] = useState(false)
  const [copied, setCopied] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [dialogMessage, setDialogMessage] = useState({ title: '', description: '', success: false })

  const loadIntegration = async () => {
    if (!session?.access_token) return
    
    try {
      const res = await fetch('/api/integrations', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      })
      
      if (res.ok) {
        const data = await res.json()
        const telegramIntegration = data.integrations?.find(i => i.integration_type === 'telegram')
        setIntegration(telegramIntegration || null)
      }
    } catch (error) {
      console.error('Failed to load integrations:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadIntegration()
    
    // Poll for integration status every 5 seconds when code is active
    let interval
    if (verificationCode && !integration) {
      interval = setInterval(loadIntegration, 5000)
    }
    
    return () => {
      if (interval) clearInterval(interval)
    }
  }, [session, verificationCode, integration])

  async function generateCode() {
    setGenerating(true)
    try {
      const res = await fetch('/api/integrations/telegram/generate-code', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      })
      
      const data = await res.json()
      if (res.ok) {
        setVerificationCode(data)
      } else {
        setDialogMessage({ title: 'Error', description: data.error || 'Failed to generate code', success: false })
        setDialogOpen(true)
      }
    } catch (error) {
      setDialogMessage({ title: 'Error', description: 'Failed to generate code', success: false })
      setDialogOpen(true)
    } finally {
      setGenerating(false)
    }
  }

  async function disconnect() {
    if (!integration?.id) return
    
    if (!confirm('Disconnect Telegram integration?')) return
    
    try {
      const res = await fetch(`/api/integrations/${integration.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      })
      
      if (res.ok) {
        setIntegration(null)
        setVerificationCode(null)
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

  function copyCode() {
    if (verificationCode?.code) {
      navigator.clipboard.writeText(verificationCode.code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-xl">✈️</span>
              </div>
              <div>
                <CardTitle>Telegram</CardTitle>
                <CardDescription>Manage projects from Telegram</CardDescription>
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
          {!integration && !verificationCode && (
            <div>
              <p className="text-sm text-muted-foreground mb-4">
                Connect your Telegram account to manage projects directly from Telegram.
              </p>
              <Button onClick={generateCode} disabled={generating}>
                {generating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                Connect Telegram
              </Button>
            </div>
          )}
          
          {verificationCode && !integration && (
            <div className="space-y-4">
              <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <p className="text-sm font-medium mb-2">Step 1: Copy your verification code</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 bg-white dark:bg-gray-900 px-4 py-2 rounded border text-2xl font-mono tracking-wider">
                    {verificationCode.code}
                  </code>
                  <Button variant="outline" size="icon" onClick={copyCode}>
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              
              <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <p className="text-sm font-medium mb-2">Step 2: Open Telegram bot</p>
                <a 
                  href={verificationCode.bot_url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-block"
                >
                  <Button variant="default" className="bg-blue-500 hover:bg-blue-600">
                    Open @{verificationCode.bot_username}
                  </Button>
                </a>
              </div>
              
              <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <p className="text-sm font-medium mb-2">Step 3: Send the code</p>
                <p className="text-sm text-muted-foreground">
                  In Telegram, send: <code className="bg-white dark:bg-gray-900 px-2 py-1 rounded">/start {verificationCode.code}</code>
                </p>
              </div>
              
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Waiting for verification... (expires in {Math.floor(verificationCode.expires_in / 60)} minutes)</span>
              </div>
            </div>
          )}
          
          {integration && (
            <div className="text-sm text-muted-foreground space-y-2">
              <p>Connected on {new Date(integration.created_at).toLocaleDateString()}</p>
              {integration.platform_username && (
                <p>Username: @{integration.platform_username}</p>
              )}
              {integration.metadata?.last_interaction && (
                <p>Last used: {new Date(integration.metadata.last_interaction).toLocaleString()}</p>
              )}
              
              <div className="mt-4 p-3 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded">
                <p className="text-sm font-medium text-green-900 dark:text-green-100">✅ Ready to use!</p>
                <p className="text-xs text-green-700 dark:text-green-300 mt-1">
                  Open Telegram and send /list to see your projects
                </p>
              </div>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex gap-2">
          {integration && (
            <Button onClick={disconnect} variant="destructive">
              Disconnect
            </Button>
          )}
        </CardFooter>
      </Card>

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
    </>
  )
}
