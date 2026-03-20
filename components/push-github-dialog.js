'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { GitBranch, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/components/ui/use-toast'

export function PushGitHubDialog({ projectId, repoUrl, branch, onPush, triggerLabel = 'Push to GitHub' }) {
  const [open, setOpen] = useState(false)
  const [pushing, setPushing] = useState(false)
  const [commitMessage, setCommitMessage] = useState('Update from WorkersCraft')
  const [error, setError] = useState(null)
  const { toast } = useToast()

  const handlePush = async () => {
    if (!commitMessage.trim()) {
      toast({ variant: 'destructive', title: 'Error', description: 'Commit message is required' })
      return
    }
    setPushing(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const response = await fetch(`/api/projects/${projectId}/push-github`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
          'X-GitHub-Token': session.provider_token || localStorage.getItem('gh_token') || '',
        },
        body: JSON.stringify({ commitMessage: commitMessage.trim() }),
      })
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to push to GitHub')
      }
      const data = await response.json()
      setOpen(false)
      setCommitMessage('Update from WorkersCraft')
      onPush?.(data)
    } catch (err) {
      toast({ variant: 'destructive', title: 'Push failed', description: err.message })
    } finally {
      setPushing(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="rounded-r-none">
          <GitBranch className="w-4 h-4 mr-2" />
          {triggerLabel}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Push to GitHub</DialogTitle>
          <DialogDescription>
            Push your changes to {repoUrl} ({branch})
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="commit-message">Commit Message</Label>
            <Input
              id="commit-message"
              value={commitMessage}
              onChange={(e) => setCommitMessage(e.target.value)}
              placeholder="Describe your changes..."
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handlePush()
                }
              }}
            />
          </div>

          <Button
            onClick={handlePush}
            disabled={!commitMessage.trim() || pushing}
            className="w-full"
          >
            {pushing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Pushing...
              </>
            ) : (
              'Push Changes'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
