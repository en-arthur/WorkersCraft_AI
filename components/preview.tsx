import { FragmentCode } from './fragment-code'
import { FragmentPreview } from './fragment-preview'
import { DeployVercel } from './deploy-vercel'
import { Button } from '@/components/ui/button'
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
import { ChevronsRight, ExternalLink, LoaderCircle, Maximize2, Minimize2 } from 'lucide-react'
import { Dispatch, SetStateAction } from 'react'

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
}: {
  teamID: string | undefined
  accessToken: string | undefined
  selectedTab: 'code' | 'fragment'
  onSelectedTabChange: Dispatch<SetStateAction<'code' | 'fragment'>>
  isChatLoading: boolean
  isPreviewLoading: boolean
  fragment?: DeepPartial<FragmentSchema>
  result?: ExecutionResult
  onClose: () => void
  isFullscreen?: boolean
  onToggleFullscreen?: () => void
}) {
  if (!fragment) {
    return null
  }

  const isLinkAvailable =
    result?.template &&
    getTemplateId(result?.template!) !== 'code-interpreter-v1'

  const previewUrl = (result as ExecutionResultWeb)?.url
  const fragmentFiles = getFragmentFiles(fragment)

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
            </TabsList>
          </div>
          {fragment && (
            <div className="flex items-center justify-end gap-1">
              {previewUrl && (
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
              )}
              <DeployVercel fragment={fragment} />
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
              {result && <FragmentPreview result={result as ExecutionResult} />}
            </TabsContent>
          </div>
        )}
      </Tabs>
    </div>
  )
}
