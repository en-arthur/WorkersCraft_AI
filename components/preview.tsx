import { FragmentCode } from './fragment-code'
import { FragmentPreview } from './fragment-preview'
import { DeployVercel } from './deploy-vercel'
import { PushGitHubDialog } from './push-github-dialog'
import { BackendPanel } from './backend-panel'
import { DeviceSelector, DEVICES } from './device-selector'
import { QRPopover } from './qr-popover'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { FragmentSchema } from '@/lib/schema'
import { getTemplateId } from '@/lib/templates'
import { ExecutionResult, ExecutionResultWeb } from '@/lib/types'
import { DeepPartial } from 'ai'
import { ChevronsRight, ExternalLink, LoaderCircle, Maximize2, Minimize2, MoreVertical, RotateCw } from 'lucide-react'
import { Dispatch, SetStateAction, useState, useEffect, useRef } from 'react'

interface FragmentFiles {
  name: string
  path: string
  content: string
}

function getFragmentFiles(fragment: DeepPartial<FragmentSchema>): FragmentFiles[] {
  // Check for multi-file format first
  if (fragment.files && Array.isArray(fragment.files) && fragment.files.length > 0) {
    return fragment.files
      .filter((f): f is NonNullable<typeof f> => f != null)
      .map((file) => ({
        name: file.file_name || file.file_path?.split('/').pop() || 'file',
        path: file.file_path || '',
        content: file.file_content || '',
      }))
  }

  // Fallback to single file format
  if (fragment.code && fragment.file_path) {
    return [{
      name: fragment.file_path.split('/').pop() || 'file',
      path: fragment.file_path,
      content: fragment.code,
    }]
  }

  return []
}

export function Preview({
  teamID,
  accessToken,
  selectedTab,
  onSelectedTabChange,
  isChatLoading,
  isPreviewLoading,
  fragment,
  result,
  onClose,
  isFullscreen,
  onToggleFullscreen,
  projectId,
  backendAppId,
  onGitHubConnect,
}: {
  teamID: string | undefined
  accessToken: string | undefined
  selectedTab: 'code' | 'fragment' | 'backend'
  onSelectedTabChange: Dispatch<SetStateAction<'code' | 'fragment' | 'backend'>>
  isChatLoading: boolean
  isPreviewLoading: boolean
  fragment?: DeepPartial<FragmentSchema>
  result?: ExecutionResult
  onClose: () => void
  isFullscreen?: boolean
  onToggleFullscreen?: () => void
  projectId?: string
  backendAppId?: string
  onGitHubConnect?: () => void
}) {
  const [device, setDevice] = useState<keyof typeof DEVICES>('desktop')
  const [refreshKey, setRefreshKey] = useState(0)
  const lastRefreshTimeRef = useRef<number>(0)

  // Reset timestamp when result changes (new project loaded)
  useEffect(() => {
    if (result) {
      lastRefreshTimeRef.current = Date.now()
    }
  }, [result])

  // Auto-refresh Expo when switching to preview tab
  useEffect(() => {
    if (selectedTab === 'fragment' && result) {
      const isExpo = 'url' in result && result.url?.includes('8081')
      const now = Date.now()
      const timeSinceLastRefresh = now - lastRefreshTimeRef.current
      
      // If Expo and more than 30 seconds since last refresh, auto-refresh
      if (isExpo && timeSinceLastRefresh > 30000) {
        setRefreshKey(prev => prev + 1)
        lastRefreshTimeRef.current = now
      }
    }
  }, [selectedTab, result])

  // Auto-set device based on template and load preference
  useEffect(() => {
    const templateId = result?.template ? getTemplateId(result.template) : null
    const isMobileTemplate = templateId === 'expo-developer'
    
    if (isMobileTemplate) {
      // Set mobile device in state only - don't persist to localStorage
      setDevice('pixel-7a')
    } else {
      // Load saved web preference from localStorage
      const saved = localStorage.getItem('workerscraft_preview_device')
      const mobileKeys = ['mobile', 'mobile-large', 'iphone-se', 'iphone-15-pro', 'pixel-7a', 'galaxy-s24-ultra']
      if (saved && saved in DEVICES && !mobileKeys.includes(saved)) {
        setDevice(saved as keyof typeof DEVICES)
      } else {
        setDevice('desktop')
      }
    }
  }, [result?.template])

  // Save device preference (only for non-mobile devices)
  const handleDeviceChange = (newDevice: keyof typeof DEVICES) => {
    setDevice(newDevice)
    const mobileKeys = ['mobile', 'mobile-large', 'iphone-se', 'iphone-15-pro', 'pixel-7a', 'galaxy-s24-ultra']
    if (!mobileKeys.includes(newDevice)) {
      localStorage.setItem('workerscraft_preview_device', newDevice)
    }
  }

  if (!fragment) {
    return null
  }

  const isLinkAvailable =
    result?.template &&
    getTemplateId(result?.template!) !== 'code-interpreter-v1'

  const previewUrl = (result as ExecutionResultWeb)?.url
  const fragmentFiles = getFragmentFiles(fragment)
  const deviceConfig = DEVICES[device]

  return (
    <div className={`relative transition-all duration-300 ${isFullscreen ? 'fixed inset-0 z-50' : 'absolute md:relative'} top-0 left-0 shadow-2xl md:rounded-tl-3xl md:rounded-bl-3xl md:border-l md:border-y bg-popover h-full w-full overflow-auto`}>
      <Tabs
        value={selectedTab}
        onValueChange={(value) =>
          onSelectedTabChange(value as 'code' | 'fragment')
        }
        className="h-full flex flex-col items-start justify-start"
      >
        <div className="w-full p-2 grid grid-cols-3 items-center border-b sticky top-0 bg-popover z-10">
          <TooltipProvider>
            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-muted-foreground"
                  onClick={onClose}
                >
                  <ChevronsRight className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Close sidebar</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <div className="flex justify-center">
            <TabsList className="px-1 py-0 border h-8">
              <TabsTrigger
                className="font-normal text-xs py-1 px-2 gap-1 flex items-center"
                value="code"
              >
                {isChatLoading && (
                  <LoaderCircle
                    strokeWidth={3}
                    className="h-3 w-3 animate-spin"
                  />
                )}
                Code
              </TabsTrigger>
              <TabsTrigger
                disabled={!result}
                className="font-normal text-xs py-1 px-2 gap-1 flex items-center"
                value="fragment"
              >
                Preview
                {isPreviewLoading && (
                  <LoaderCircle
                    strokeWidth={3}
                    className="h-3 w-3 animate-spin"
                  />
                )}
              </TabsTrigger>
              {backendAppId && (
                <TabsTrigger className="font-normal text-xs py-1 px-2" value="backend">
                  Backend
                </TabsTrigger>
              )}
            </TabsList>
          </div>
          {fragment && (
            <div className="flex items-center justify-end gap-2">
              {/* Device Selector - Always visible on Preview tab */}
              {selectedTab === 'fragment' && (
                <div className="hidden md:block">
                  <DeviceSelector device={device} onDeviceChange={handleDeviceChange} />
                </div>
              )}

              {/* Deploy - Always visible */}

              {/* Desktop: Show all actions */}
              <div className="hidden lg:flex items-center gap-2">
                {previewUrl && (
                  <>
                    <TooltipProvider>
                      <Tooltip delayDuration={0}>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-muted-foreground"
                            onClick={() => setRefreshKey(prev => prev + 1)}
                          >
                            <RotateCw className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Refresh preview</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    <TooltipProvider>
                      <Tooltip delayDuration={0}>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-muted-foreground"
                            onClick={() => window.open(previewUrl, '_blank')}
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Open in new tab</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    <QRPopover url={previewUrl} />
                  </>
                )}
                {projectId && fragment.github_repo_url && fragment.github_branch && (
                  <PushGitHubDialog
                    projectId={projectId}
                    repoUrl={fragment.github_repo_url}
                    branch={fragment.github_branch}
                    onPush={onGitHubConnect}
                  />
                )}
              </div>

              {/* Mobile/Tablet: More menu */}
              <div className="lg:hidden">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="text-muted-foreground">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {selectedTab === 'fragment' && (
                      <div className="md:hidden">
                        <DropdownMenuItem className="font-semibold text-xs text-muted-foreground">
                          Device Preview
                        </DropdownMenuItem>
                        {Object.entries(DEVICES).map(([key, config]) => {
                          const Icon = config.icon
                          const deviceKey = key as keyof typeof DEVICES
                          return (
                            <DropdownMenuItem
                              key={key}
                              onClick={() => handleDeviceChange(deviceKey)}
                              className="gap-2"
                            >
                              <Icon className="h-4 w-4" />
                              {config.label}
                              {device === key && <span className="ml-auto">✓</span>}
                            </DropdownMenuItem>
                          )
                        })}
                        <DropdownMenuSeparator />
                      </div>
                    )}
                    {previewUrl && (
                      <DropdownMenuItem onClick={() => window.open(previewUrl, '_blank')}>
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Open in new tab
                      </DropdownMenuItem>
                    )}
                    {projectId && fragment.github_repo_url && fragment.github_branch && (
                      <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                        <PushGitHubDialog
                          projectId={projectId}
                          repoUrl={fragment.github_repo_url}
                          branch={fragment.github_branch}
                          onPush={onGitHubConnect}
                        />
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Fullscreen - Always visible */}
              {onToggleFullscreen && (
                <TooltipProvider>
                  <Tooltip delayDuration={0}>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground"
                        onClick={onToggleFullscreen}
                      >
                        {isFullscreen ? (
                          <Minimize2 className="h-4 w-4" />
                        ) : (
                          <Maximize2 className="h-4 w-4" />
                        )}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      {isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
          )}
        </div>
        {fragment && fragmentFiles.length > 0 && (
          <div className="overflow-y-auto w-full h-full">
            <TabsContent value="code" className="h-full">
              <FragmentCode files={fragmentFiles} />
            </TabsContent>
            <TabsContent value="fragment" className="h-full">
              {result && <FragmentPreview result={result as ExecutionResult} device={deviceConfig} refreshKey={refreshKey} fragment={fragment} teamID={teamID} accessToken={accessToken} />}
            </TabsContent>
            {backendAppId && (
              <TabsContent value="backend" className="h-full">
                <BackendPanel appId={backendAppId} projectId={projectId} />
              </TabsContent>
            )}
          </div>
        )}
      </Tabs>
    </div>
  )
}
