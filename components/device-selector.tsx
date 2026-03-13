'use client'

import { Monitor, Laptop, Tablet, Smartphone } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export const DEVICES = {
  desktop: { width: '100%', height: '100%', label: 'Desktop', icon: Monitor },
  laptop: { width: 1366, height: 768, label: 'Laptop', icon: Laptop },
  tablet: { width: 768, height: 1024, label: 'Tablet', icon: Tablet },
  mobile: { width: 375, height: 667, label: 'Mobile', icon: Smartphone },
  'mobile-large': { width: 414, height: 896, label: 'Mobile L', icon: Smartphone },
}

export function DeviceSelector({ 
  device, 
  onDeviceChange 
}: { 
  device: keyof typeof DEVICES
  onDeviceChange: (device: keyof typeof DEVICES) => void
}) {
  const CurrentIcon = DEVICES[device].icon

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="text-muted-foreground">
          <CurrentIcon className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {Object.entries(DEVICES).map(([key, config]) => {
          const Icon = config.icon
          return (
            <DropdownMenuItem
              key={key}
              onClick={() => onDeviceChange(key)}
              className="gap-2"
            >
              <Icon className="h-4 w-4" />
              {config.label}
              {device === key && <span className="ml-auto">✓</span>}
            </DropdownMenuItem>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
