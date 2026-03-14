'use client'

import { ConnectGitHubDialog } from './connect-github-dialog'
import { PushGitHubDialog } from './push-github-dialog'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ChevronDown, Unlink } from 'lucide-react'
import { supabase } from '@/lib/supabase'

export function GitHubButton({ projectId, hasGitHubRepo, githubRepoUrl, githubBranch, onConnect, onPush, onDisconnect }) {
  if (!hasGitHubRepo) {
    return <ConnectGitHubDialog projectId={projectId} onConnect={onConnect} />
  }

  const repoName = githubRepoUrl?.split('/').slice(-1)[0]?.replace('.git', '') ?? 'repo'

  const handleDisconnect = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    await fetch(`/api/projects/${projectId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session?.access_token}`,
      },
      body: JSON.stringify({
        github_repo_url: null,
        github_branch: null,
        github_last_synced_at: null,
        github_last_commit_sha: null,
      }),
    })
    onDisconnect?.()
  }

  return (
    <div className="flex items-center">
      <PushGitHubDialog
        projectId={projectId}
        repoUrl={githubRepoUrl}
        branch={githubBranch}
        onPush={onPush}
        triggerLabel={`${repoName}/${githubBranch}`}
      />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="px-1 border-l-0 rounded-l-none">
            <ChevronDown className="w-3 h-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={handleDisconnect} className="text-red-600 focus:text-red-600 gap-2">
            <Unlink className="w-4 h-4" />
            Disconnect
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
