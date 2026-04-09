import { CopyButton } from './ui/copy-button'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { QRPopover } from './qr-popover'
import { ExecutionResultWeb } from '@/lib/types'
import { FragmentSchema } from '@/lib/schema'
import { ExternalLink, RotateCw } from 'lucide-react'
import { useState, useEffect, useRef } from 'react'
import * as React from 'react'
import { DeepPartial } from 'ai'

interface DeviceConfig {
  width: number | string
  height: number | string
  label: string
}

export function FragmentWeb({ 
  result, 
  device,
  refreshKey = 0,
  fragment,
  teamID,
  accessToken
}: { 
  result: ExecutionResultWeb
  device?: DeviceConfig
  refreshKey?: number
  fragment?: DeepPartial<FragmentSchema>
  teamID?: string
  accessToken?: string
}) {
  const [iframeKey, setIframeKey] = useState(0)
  const [barVisible, setBarVisible] = useState(false)
  const [isRestarting, setIsRestarting] = useState(false)
  const [currentUrl, setCurrentUrl] = useState(result.url)
  const isRestartingRef = useRef(false)

  const isExpo = currentUrl?.includes('8081')

  // Restart sandbox by calling /api/sandbox/restart or creating new
  const restartSandbox = async () => {
    if (!fragment || isRestartingRef.current) return
    
    isRestartingRef.current = true
    setIsRestarting(true)
    
    try {
      // Try to restart existing sandbox first (faster)
      if (result.sbxId && isExpo) {
        const response = await fetch('/api/sandbox/restart', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sandboxId: result.sbxId,
            template: result.template
          })
        })
        
        if (response.ok) {
          const data = await response.json()
          if (data.url) {
            setCurrentUrl(data.url)
            setIframeKey(prev => prev + 1)
            return
          }
        }
      }
      
      // Fallback: Create new sandbox (if restart failed or no sbxId)
      const response = await fetch('/api/sandbox', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken && { Authorization: `Bearer ${accessToken}` })
        },
        body: JSON.stringify({
          fragment,
          userID: undefined,
          teamID,
          accessToken
        })
      })
      
      if (response.ok) {
        const data = await response.json()
        if (data.url) {
          setCurrentUrl(data.url)
          setIframeKey(prev => prev + 1)
        }
      }
    } catch (error) {
      console.error('Failed to restart sandbox:', error)
    } finally {
      setIsRestarting(false)
      isRestartingRef.current = false
    }
  }

  // Manual refresh via refreshKey
  React.useEffect(() => {
    if (refreshKey > 0 && isExpo) {
      restartSandbox()
    } else if (refreshKey > 0) {
      setIframeKey(refreshKey)
    }
  }, [refreshKey])

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
        <div className={`flex-1 overflow-hidden ${isMobile ? 'rounded-[28px]' : ''} relative`}>
          {isRestarting && (
            <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-10 rounded-[28px]">
              <div className="text-white text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
                <p className="text-sm">Reconnecting preview...</p>
              </div>
            </div>
          )}
          <iframe
            key={iframeKey}
            className="h-full w-full border-0"
            sandbox="allow-forms allow-scripts allow-same-origin"
            loading="lazy"
            src={currentUrl}
          />
        </div>
      </div>
    </div>
  )
}
