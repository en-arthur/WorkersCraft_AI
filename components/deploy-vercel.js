'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Loader2, ExternalLink } from 'lucide-react'

export function DeployVercel({ fragment }) {
  const [isDeploying, setIsDeploying] = useState(false)
  const [deployUrl, setDeployUrl] = useState(null)
  const [error, setError] = useState(null)

  const handleDeploy = async () => {
    // Check if fragment has any content
    if (!fragment) return

    setIsDeploying(true)
    setError(null)
    setDeployUrl(null)

    try {
      const response = await fetch('/api/deploy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code: fragment.code,
          filePath: fragment.file_path,
          files: fragment.files,
          template: fragment.template,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Deployment failed')
      }

      setDeployUrl(data.url)
    } catch (err) {
      setError(err.message)
    } finally {
      setIsDeploying(false)
    }
  }

  return (
    <div className="space-y-2">
      <Button
        variant="default"
        size="sm"
        onClick={handleDeploy}
        disabled={!fragment || isDeploying}
        className="gap-2"
      >
        {isDeploying ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <ExternalLink className="w-4 h-4" />
        )}
        Deploy
      </Button>

      {deployUrl && (
        <div className="text-sm">
          <a
            href={deployUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-green-600 hover:underline flex items-center gap-1"
          >
            View Deployment <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      )}

      {error && (
        <p className="text-sm text-red-500">{error}</p>
      )}
    </div>
  )
}
