'use client'

import { QRCodeSVG } from 'qrcode.react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { QrCode, Copy, Check } from 'lucide-react'
import { useState } from 'react'

export function QRPopover({ url, size = 'sm' }: { url: string; size?: 'sm' | 'default' }) {
  const [copied, setCopied] = useState(false)

  const copy = () => {
    navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size={size} title="Share QR code">
          <QrCode className="w-4 h-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-4 flex flex-col items-center gap-3" align="end">
        <p className="text-xs text-muted-foreground text-center">Scan to open on your device</p>
        <QRCodeSVG value={url} size={160} />
        <Button variant="outline" size="sm" className="w-full gap-2" onClick={copy}>
          {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
          {copied ? 'Copied!' : 'Copy URL'}
        </Button>
      </PopoverContent>
    </Popover>
  )
}
