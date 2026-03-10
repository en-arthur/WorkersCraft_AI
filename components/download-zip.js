'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Download, Loader2 } from 'lucide-react'
import JSZip from 'jszip'

export function DownloadZip({ fragment }) {
  const [isDownloading, setIsDownloading] = useState(false)

  const handleDownload = async () => {
    if (!fragment?.code || !fragment?.file_path) return

    setIsDownloading(true)
    try {
      const zip = new JSZip()
      
      // Get the file name from the path
      const fileName = fragment.file_path.split('/').pop() || 'app.js'
      
      // Add the main file
      zip.file(fileName, fragment.code)
      
      // If there are additional files, add them
      if (fragment.files && Array.isArray(fragment.files)) {
        fragment.files.forEach((file) => {
          zip.file(file.path, file.content)
        })
      }

      // Generate ZIP
      const content = await zip.generateAsync({ type: 'blob' })
      
      // Trigger download
      const url = URL.createObjectURL(content)
      const a = document.createElement('a')
      a.href = url
      a.download = `workerscraft-${Date.now()}.zip`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Error generating ZIP:', error)
    } finally {
      setIsDownloading(false)
    }
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleDownload}
      disabled={!fragment?.code || isDownloading}
      className="gap-2"
    >
      {isDownloading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <Download className="w-4 h-4" />
      )}
      Download ZIP
    </Button>
  )
}
