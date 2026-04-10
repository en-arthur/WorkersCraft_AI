'use client'

import { Monitor, Laptop, Tablet, Smartphone } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export const DEVICES = {
  desktop: { width: '100%', height: '100%', label: 'Desktop', icon: Monitor },
  laptop: { width: 1366, height: 768, label: 'Laptop', icon: Laptop },
  tablet: { width: 768, height: 1024, label: 'Tablet', icon: Tablet },
  // Hidden legacy keys (used internally)
  mobile: { width: 375, height: 667, label: 'Mobile', icon: Smartphone },
  'mobile-large': { width: 414, height: 896, label: 'Mobile L', icon: Smartphone },
  // Named phone devices
  'iphone-se': { width: 375, height: 667, label: 'iPhone SE', icon: Smartphone },
  'iphone-15-pro': { width: 393, height: 852, label: 'iPhone 15 Pro', icon: Smartphone },
  'pixel-7a': { width: 360, height: 780, label: 'Pixel 7a', icon: Smartphone },
  'galaxy-s24-ultra': { width: 412, height: 915, label: 'Galaxy S24 Ultra', icon: Smartphone },
}

const DROPDOWN_GROUPS = [
  [
    { key: 'desktop', label: 'Desktop', Icon: Monitor },
    { key: 'laptop', label: 'Laptop', Icon: Laptop },
    { key: 'tablet', label: 'Tablet', Icon: Tablet },
  ],
  [
    { key: 'iphone-se', label: 'iPhone SE', Icon: Smartphone },
    { key: 'iphone-15-pro', label: 'iPhone 15 Pro', Icon: Smartphone },
  ],
  [
    { key: 'pixel-7a', label: 'Pixel 7a', Icon: Smartphone },
    { key: 'galaxy-s24-ultra', label: 'Galaxy S24 Ultra', Icon: Smartphone },
  ],
]

export function DeviceSelector({
  device,
  onDeviceChange
}: {
  device: keyof typeof DEVICES
  onDeviceChange: (device: keyof typeof DEVICES) => void
}) {
  const CurrentIcon = DEVICES[device]?.icon || Smartphone

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="text-muted-foreground">
          <CurrentIcon className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {DROPDOWN_GROUPS.map((group, gi) => (
          <>
            {gi > 0 && <DropdownMenuSeparator key={`sep-${gi}`} />}
            {group.map(({ key, label, Icon }) => (
              <DropdownMenuItem
                key={key}
                onClick={() => onDeviceChange(key as keyof typeof DEVICES)}
                className="gap-2"
              >
                <Icon className="h-4 w-4" />
                {label}
                {device === key && <span className="ml-auto">✓</span>}
              </DropdownMenuItem>
            ))}
          </>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
