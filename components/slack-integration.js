'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react'

export function SlackIntegration({ session }) {
  const [integration, setIntegration] = useState(null)
  const [loading, setLoading] = useState(true)
  const [connecting, setConnecting] = useState(false)
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
        const slackIntegration = data.integrations?.find(i => i.integration_type === 'slack')
        setIntegration(slackIntegration || null)
      }
    } catch (error) {
      console.error('Failed to load integrations:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadIntegration()
  }, [session])

  async function connectSlack() {
    if (!session?.user?.id) return
    
    setConnecting(true)
    
    // Redirect to Slack OAuth
    window.location.href = `/api/integrations/slack/oauth?user_id=${session.user.id}`
  }

  async function disconnect() {
    if (!integration?.id) return
    
    if (!confirm('Disconnect Slack integration?')) return
    
    try {
      const res = await fetch(`/api/integrations/${integration.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      })
      
      if (res.ok) {
        setIntegration(null)
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
              <div className="w-10 h-10 bg-purple-600 rounded flex items-center justify-center">
                <span className="text-white font-bold text-xl">#</span>
              </div>
              <div>
                <CardTitle>Slack</CardTitle>
                <CardDescription>Manage projects from Slack</CardDescription>
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
          {!integration && (
            <div>
              <p className="text-sm text-muted-foreground mb-4">
                Connect your Slack workspace to manage projects directly from Slack with interactive buttons.
              </p>
              <Button onClick={connectSlack} disabled={connecting}>
                {connecting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                Connect to Slack
              </Button>
            </div>
          )}
          
          {integration && (
            <div className="text-sm text-muted-foreground space-y-2">
              <p>Connected on {new Date(integration.created_at).toLocaleDateString()}</p>
              {integration.platform_team_name && (
                <p>Workspace: {integration.platform_team_name}</p>
              )}
              {integration.metadata?.last_interaction && (
                <p>Last used: {new Date(integration.metadata.last_interaction).toLocaleString()}</p>
              )}
              
              <div className="mt-4 p-3 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded">
                <p className="text-sm font-medium text-green-900 dark:text-green-100">✅ Ready to use!</p>
                <p className="text-xs text-green-700 dark:text-green-300 mt-1">
                  In Slack, type <code className="bg-white dark:bg-gray-900 px-1 rounded">/workerscraft list</code> to see your projects
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
