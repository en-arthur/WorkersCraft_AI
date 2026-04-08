'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Loader2, ExternalLink, ChevronDown } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/components/ui/use-toast'

export function DeployVercel({ fragment, sandboxId, isPreviewLoading, isChatLoading }) {
  const { toast } = useToast()
  const [isDeploying, setIsDeploying] = useState(false)
  const [deployStatus, setDeployStatus] = useState(null) // null | 'building' | 'success' | 'failed'
  const [showGitHubDialog, setShowGitHubDialog] = useState(false)
  const [commitMessage, setCommitMessage] = useState('Deploy from WorkersCraft')

  const hasGitHub = fragment?.github_repo_url && fragment?.github_branch

  async function pollDeploymentStatus(dbDeploymentId, token) {
    try {
      const res = await fetch(`/api/deployments/${dbDeploymentId}/check-vercel-status`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await res.json()
      setDeployStatus(data.status)

      if (data.status === 'building') {
        setTimeout(() => pollDeploymentStatus(dbDeploymentId, token), 5000)
      } else if (data.status === 'success') {
        setIsDeploying(false)
        toast({
          title: '🚀 Deployment Ready!',
          description: (
            <a href={data.deployment_url} target="_blank" rel="noopener noreferrer" className="underline flex items-center gap-1">
              {data.deployment_url} <ExternalLink className="w-3 h-3" />
            </a>
          ),
        })
      } else if (data.status === 'failed') {
        setIsDeploying(false)
        toast({ variant: 'destructive', title: 'Deployment failed', description: data.error_message || 'Build failed' })
      }
    } catch {
      setIsDeploying(false)
    }
  }

  const handleDirectDeploy = async () => {
    if (!fragment) return
    setIsDeploying(true)
    setDeployStatus('building')
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Please log in to deploy')

      const response = await fetch('/api/deploy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
        body: JSON.stringify({ fragment, sandboxId }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Deployment failed')

      // Start polling if we have a DB deployment ID
      if (data.dbDeploymentId) {
        // Show queued toast
        toast({ title: '⏳ Deployment queued', description: 'Building your app on Vercel...' })
        pollDeploymentStatus(data.dbDeploymentId, session.access_token)
      } else {
        // Fallback: show URL immediately
        setIsDeploying(false)
        setDeployStatus('success')
        toast({
          title: 'Deployed!',
          description: (
            <a href={data.url} target="_blank" rel="noopener noreferrer" className="underline flex items-center gap-1">
              {data.url} <ExternalLink className="w-3 h-3" />
            </a>
          ),
        })
      }
    } catch (err) {
      setIsDeploying(false)
      setDeployStatus('failed')
      toast({ variant: 'destructive', title: 'Deployment failed', description: err.message })
    }
  }

  const handleGitHubDeploy = async () => {
    if (!fragment || !commitMessage.trim()) return
    setIsDeploying(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Please log in to deploy')

      const response = await fetch('/api/deploy-github', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
        body: JSON.stringify({ fragment, commitMessage: commitMessage.trim() }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Deployment failed')

      setShowGitHubDialog(false)
      setCommitMessage('Deploy from WorkersCraft')
      toast({
        title: 'Deployed!',
        description: (
          <a href={data.url} target="_blank" rel="noopener noreferrer" className="underline flex items-center gap-1">
            {data.url} <ExternalLink className="w-3 h-3" />
          </a>
        ),
      })
    } catch (err) {
      toast({ variant: 'destructive', title: 'Deployment failed', description: err.message })
    } finally {
      setIsDeploying(false)
    }
  }

  return (
    <>
      {hasGitHub ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="default" size="sm" disabled={!fragment || isDeploying || isPreviewLoading || isChatLoading} className="gap-2">
              {isDeploying ? <Loader2 className="w-4 h-4 animate-spin" /> : <ExternalLink className="w-4 h-4" />}
              {isDeploying && deployStatus === 'building' ? 'Building...' : 'Deploy'}
              <ChevronDown className="w-3 h-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={handleDirectDeploy}>Deploy Now (Direct)</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setShowGitHubDialog(true)}>Deploy from GitHub</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : (
        <Button variant="default" size="sm" onClick={handleDirectDeploy} disabled={!fragment || isDeploying || isPreviewLoading || isChatLoading} className="gap-2">
          {isDeploying ? <Loader2 className="w-4 h-4 animate-spin" /> : <ExternalLink className="w-4 h-4" />}
          {isDeploying && deployStatus === 'building' ? 'Building...' : 'Deploy'}
        </Button>
      )}

      <Dialog open={showGitHubDialog} onOpenChange={setShowGitHubDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Deploy from GitHub</DialogTitle>
            <DialogDescription>Push changes to GitHub and deploy from {fragment?.github_repo_url}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="commit-msg">Commit Message</Label>
              <Input
                id="commit-msg"
                value={commitMessage}
                onChange={(e) => setCommitMessage(e.target.value)}
                placeholder="Describe your changes..."
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleGitHubDeploy() } }}
              />
            </div>
            <Button onClick={handleGitHubDeploy} disabled={!commitMessage.trim() || isDeploying} className="w-full">
              {isDeploying ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Deploying...</> : 'Push & Deploy'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
