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
  const [showGitHubDialog, setShowGitHubDialog] = useState(false)
  const [commitMessage, setCommitMessage] = useState('Deploy from WorkersCraft')

  const hasGitHub = fragment?.github_repo_url && fragment?.github_branch

  const handleDirectDeploy = async () => {
    if (!fragment) return
    setIsDeploying(true)
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
              Deploy
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
          Deploy
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
