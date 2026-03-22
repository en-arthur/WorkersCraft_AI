import { CopyButton } from './ui/copy-button'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { ExecutionResultWeb } from '@/lib/types'
import { RotateCw } from 'lucide-react'
import { useState } from 'react'

interface DeviceConfig {
  width: number | string
  height: number | string
  label: string
}

export function FragmentWeb({ 
  result, 
  device 
}: { 
  result: ExecutionResultWeb
  device?: DeviceConfig
}) {
  const [iframeKey, setIframeKey] = useState(0)
  if (!result) return null

  function refreshIframe() {
    setIframeKey((prevKey) => prevKey + 1)
  }

  const isFullWidth = !device || device.width === '100%'
  const isMobile = device?.label?.toLowerCase().includes('mobile')
  const containerStyle = isFullWidth ? {} : {
    width: typeof device.width === 'number' ? `${device.width}px` : device.width,
    height: typeof device.height === 'number' ? `${device.height}px` : device.height,
    maxWidth: '100%',
    maxHeight: '100%',
  }

  return (
    <div className="flex flex-col w-full h-full items-center justify-center bg-gray-50">
      <div 
        className={`flex flex-col transition-all duration-300 ${isMobile ? 'bg-gray-900 rounded-[40px] p-2 shadow-2xl border-4 border-gray-800' : 'bg-white'}`}
        style={isFullWidth ? { width: '100%', height: '100%' } : containerStyle}
      >
        {isMobile && (
          <div className="flex justify-center items-center py-2 shrink-0">
            <div className="w-20 h-5 bg-gray-800 rounded-full" />
          </div>
        )}
        <div className={`flex-1 overflow-hidden ${isMobile ? 'rounded-[28px]' : ''}`}>
          <iframe
            key={iframeKey}
            className="h-full w-full border-0"
            sandbox="allow-forms allow-scripts allow-same-origin"
            loading="lazy"
            src={result.url}
          />
        </div>
      </div>
      <div className="p-2 border-t w-full bg-popover">
        <div className="flex items-center bg-muted rounded-2xl">
          <TooltipProvider>
            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <Button
                  variant="link"
                  className="text-muted-foreground"
                  onClick={refreshIframe}
                >
                  <RotateCw className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Refresh</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <span className="text-muted-foreground text-xs flex-1 text-ellipsis overflow-hidden whitespace-nowrap">
            {result.url}
          </span>
          <TooltipProvider>
            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <CopyButton
                  variant="link"
                  content={result.url}
                  className="text-muted-foreground"
                />
              </TooltipTrigger>
              <TooltipContent>Copy URL</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
    </div>
  )
}
