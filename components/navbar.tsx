import Logo from './logo'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { GitHubButton } from './github-button'
import { MobileBuildButton } from './mobile-build-button'
import { DeployVercel } from './deploy-vercel'
import { Session } from '@supabase/supabase-js'
import { Undo, FolderOpen, Download } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'

export function NavBar({
  session,
  showLogin,
  signOut,
  onUndo,
  canUndo,
  projectId,
  platform,
  fragment,
  sandboxId,
  isPreviewLoading,
  hasGitHubRepo,
  githubRepoUrl,
  githubBranch,
  onGitHubConnect,
  onGitHubPush,
  onGitHubDisconnect,
}: {
  session: Session | null
  showLogin: () => void
  signOut: () => void
  onUndo: () => void
  canUndo: boolean
  projectId?: string
  platform?: string
  fragment?: any
  sandboxId?: string
  isPreviewLoading?: boolean
  hasGitHubRepo?: boolean
  githubRepoUrl?: string
  githubBranch?: string
  onGitHubConnect?: (data?: { github_repo_url?: string; github_branch?: string }) => void
  onGitHubPush?: () => void
  onGitHubDisconnect?: () => void
}) {
  const [forceOpenConnect, setForceOpenConnect] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)

  async function handleDownload() {
    if (!sandboxId) return
    setIsDownloading(true)
    try {
      const res = await fetch('/api/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sandboxId }),
      })
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'project.zip'
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setIsDownloading(false)
    }
  }

  return (
    <>
      {isDownloading && (
        <div className="fixed top-0 left-0 w-full h-0.5 bg-muted overflow-hidden z-50 pointer-events-none">
          <div className="h-full bg-primary w-1/2 progress-bar-indeterminate" />
        </div>
      )}
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
        {projectId && (
          <GitHubButton
            projectId={projectId}
            platform={platform}
            hasGitHubRepo={!!hasGitHubRepo}
            githubRepoUrl={githubRepoUrl}
            githubBranch={githubBranch}
            onConnect={onGitHubConnect}
            onPush={onGitHubPush}
            onDisconnect={onGitHubDisconnect}
            forceOpenConnect={forceOpenConnect}
            onForceOpenHandled={() => setForceOpenConnect(false)}
          />
        )}
        {projectId && platform === 'mobile' && (
          <MobileBuildButton
            projectId={projectId}
            hasGitHubRepo={!!hasGitHubRepo}
            githubRepoUrl={githubRepoUrl}
            onNeedRepo={() => setForceOpenConnect(true)}
          />
        )}
        {fragment && (
          <TooltipProvider>
            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleDownload}
                  disabled={!sandboxId || isPreviewLoading || isDownloading}
                >
                  <Download className="h-4 w-4 md:h-5 md:w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Download project</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
        {fragment && platform !== 'mobile' && (
          <DeployVercel fragment={fragment} sandboxId={sandboxId} isPreviewLoading={isPreviewLoading} />
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
    </>
  )
}
