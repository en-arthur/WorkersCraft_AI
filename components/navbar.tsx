import Logo from './logo'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { ConnectGitHubDialog } from './connect-github-dialog'
import { PushGitHubDialog } from './push-github-dialog'
import { Session } from '@supabase/supabase-js'
import { Undo, FolderOpen } from 'lucide-react'
import Link from 'next/link'

export function NavBar({
  session,
  showLogin,
  signOut,
  onUndo,
  canUndo,
  projectId,
  hasGitHubRepo,
  githubRepoUrl,
  githubBranch,
  onGitHubConnect,
  onGitHubPush,
}: {
  session: Session | null
  showLogin: () => void
  signOut: () => void
  onUndo: () => void
  canUndo: boolean
  projectId?: string
  hasGitHubRepo?: boolean
  githubRepoUrl?: string
  githubBranch?: string
  onGitHubConnect?: () => void
  onGitHubPush?: () => void
}) {
  return (
    <nav className="w-full flex bg-background py-4">
      <div className="flex flex-1 items-center">
        <Link href="/" className="flex items-center gap-2">
          <Logo width={24} height={24} />
          <h1 className="font-bold">WorkersCraft AI</h1>
        </Link>
      </div>
      <div className="flex items-center gap-1 md:gap-4">
        <TooltipProvider>
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <Link href="/dashboard">
                <Button variant="ghost" size="icon">
                  <FolderOpen className="h-4 w-4" />
                </Button>
              </Link>
            </TooltipTrigger>
            <TooltipContent>
              <p>My Projects</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        {projectId && !hasGitHubRepo && onGitHubConnect && (
          <ConnectGitHubDialog 
            projectId={projectId} 
            onConnect={onGitHubConnect}
          />
        )}
        {projectId && hasGitHubRepo && githubRepoUrl && githubBranch && (
          <PushGitHubDialog
            projectId={projectId}
            repoUrl={githubRepoUrl}
            branch={githubBranch}
            onPush={onGitHubPush}
          />
        )}
        <TooltipProvider>
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={onUndo}
                disabled={!canUndo}
              >
                <Undo className="h-4 w-4 md:h-5 md:w-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Undo</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </nav>
  )
}
