'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Smartphone, ChevronDown, Loader2, CheckCircle2, XCircle, Download, AlertTriangle } from 'lucide-react'
import { supabase } from '@/lib/supabase'

const STATUS_LABELS = {
  queued: 'Queued...',
  in_progress: 'Building...',
  completed: 'Complete',
  failed: 'Failed',
}

export function MobileBuildButton({ projectId, hasGitHubRepo, githubRepoUrl, onNeedRepo }) {
  const [buildState, setBuildState] = useState(null) // { buildId, platform, buildType, status, artifactId }
  const [keystoreDialog, setKeystoreDialog] = useState(false)
  const [iosDialog, setIosDialog] = useState(false)
  const [keystoreData, setKeystoreData] = useState(null) // after generation
  const [keystoreAcknowledged, setKeystoreAcknowledged] = useState(false)
  const [iosFiles, setIosFiles] = useState({ p12: null, provision: null, password: '', scheme: '' })
  const [loading, setLoading] = useState(false)
  const [failedDialog, setFailedDialog] = useState(false)
  const [error, setError] = useState(null)
  const pollRef = useRef(null)

  useEffect(() => {
    if (buildState && !['completed', 'failed'].includes(buildState.status)) {
      pollRef.current = setInterval(() => pollStatus(buildState.buildId), 15000)
    }
    return () => clearInterval(pollRef.current)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [buildState?.buildId, buildState?.status])

  async function getSession() {
    const { data: { session } } = await supabase.auth.getSession()
    return session
  }

  function getGhToken(session) {
    return session?.provider_token || localStorage.getItem('gh_token') || ''
  }

  async function pollStatus(buildId) {
    const session = await getSession()
    const res = await fetch(`/api/projects/${projectId}/build-status?build_id=${buildId}`, {
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        'X-GitHub-Token': getGhToken(session),
      },
    })
    const data = await res.json()
    setBuildState(prev => ({ ...prev, status: data.status, artifactId: data.artifactId, error: data.error, runUrl: data.runUrl }))
    if (['completed', 'failed'].includes(data.status)) {
      clearInterval(pollRef.current)
      if (data.status === 'completed') localStorage.setItem(`built_${projectId}`, '1')
    }
  }

  async function triggerBuild(platform, buildType) {
    if (!hasGitHubRepo) { onNeedRepo?.(); return }
    if (buildType === 'release' && platform === 'android' && !keystoreAcknowledged) {
      setKeystoreDialog(true)
      return
    }
    if (buildType === 'release' && platform === 'ios') {
      setIosDialog(true)
      return
    }
    await startBuild(platform, buildType)
  }

  async function startBuild(platform, buildType) {
    setLoading(true)
    setError(null)
    try {
      const session = await getSession()
      const res = await fetch(`/api/projects/${projectId}/build-mobile`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
          'X-GitHub-Token': session.provider_token || localStorage.getItem('gh_token') || '',
        },
        body: JSON.stringify({ platform, buildType }),
      })
      const data = await res.json()
      if (res.status === 403 && data.error === 'upgrade_required') {
        setError('iOS builds require a Pro plan or higher. Please upgrade.')
        return
      }
      if (!res.ok) throw new Error(data.error)
      setBuildState({ buildId: data.buildId, platform, buildType, status: 'queued', artifactId: null })
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  async function generateKeystore() {
    setLoading(true)
    setError(null)
    try {
      const session = await getSession()
      const res = await fetch(`/api/projects/${projectId}/generate-keystore`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setKeystoreData(data)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  function downloadKeystore() {
    const bytes = Uint8Array.from(atob(keystoreData.keystoreBase64), c => c.charCodeAt(0))
    const blob = new Blob([bytes], { type: 'application/octet-stream' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'release.jks'
    a.click()
  }

  async function saveIosSigning() {
    setLoading(true)
    setError(null)
    try {
      const session = await getSession()
      const form = new FormData()
      form.append('p12', iosFiles.p12)
      form.append('provision', iosFiles.provision)
      form.append('p12Password', iosFiles.password)
      form.append('scheme', iosFiles.scheme)
      const res = await fetch(`/api/projects/${projectId}/ios-signing`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: form,
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setIosDialog(false)
      await startBuild('ios', 'release')
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  async function downloadArtifact() {
    const session = await getSession()
    const ghToken = getGhToken(session)
    const filename = `${buildState.platform}-${buildState.buildType}.zip`
    window.location.href = `/api/projects/${projectId}/build-artifact?artifact_id=${buildState.artifactId}&filename=${filename}&token=${session.access_token}&gh_token=${encodeURIComponent(ghToken)}`
  }

  const isBuilding = buildState && !['completed', 'failed'].includes(buildState.status)

  return (
    <>
      <div className="flex items-center gap-1">
        {buildState ? (
          <div className="flex items-center gap-2 text-sm">
            {buildState.status === 'completed' && <CheckCircle2 className="w-4 h-4 text-green-500" />}
            {buildState.status === 'failed' && (
              <button onClick={() => setFailedDialog(true)} className="flex items-center gap-1 text-red-500 hover:underline">
                <XCircle className="w-4 h-4" />
              </button>
            )}
            {isBuilding && <Loader2 className="w-4 h-4 animate-spin" />}
            <span
              className={buildState.status === 'failed' ? 'text-red-500 cursor-pointer hover:underline' : 'text-muted-foreground'}
              onClick={buildState.status === 'failed' ? () => setFailedDialog(true) : undefined}
            >
              {STATUS_LABELS[buildState.status] || buildState.status}
            </span>
            {isBuilding && !localStorage.getItem(`built_${projectId}`) && (
              <span className="text-xs text-muted-foreground italic">First build takes time while dependencies are cached. Subsequent builds will be faster.</span>
            )}
            {buildState.status === 'completed' && buildState.artifactId && (
              <Button size="sm" variant="outline" onClick={downloadArtifact} className="gap-1 h-7">
                <Download className="w-3 h-3" />
                Download
              </Button>
            )}
            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setBuildState(null)}>
              New Build
            </Button>
          </div>
        ) : (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" disabled={loading || ['queued', 'in_progress'].includes(buildState?.status)} className="gap-1">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Smartphone className="w-4 h-4" />}
                Build
                <ChevronDown className="w-3 h-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => triggerBuild('android', 'debug')}>
                Android Debug (APK)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => triggerBuild('android', 'release')}>
                Android Release (AAB)
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => triggerBuild('ios', 'debug')}>
                iOS Debug (unsigned)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => triggerBuild('ios', 'release')}>
                iOS Release (signed)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
        {error && <span className="text-xs text-red-500 max-w-48 truncate">{error}</span>}
      </div>

      {/* Android Keystore Dialog */}
      <Dialog open={keystoreDialog} onOpenChange={setKeystoreDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Android Release Signing</DialogTitle>
            <DialogDescription>
              A keystore will be auto-generated to sign your AAB for the Play Store.
            </DialogDescription>
          </DialogHeader>
          {!keystoreData ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Click below to generate a keystore. You will be required to download it before proceeding.
              </p>
              {error && <p className="text-sm text-red-500">{error}</p>}
              <Button onClick={generateKeystore} disabled={loading} className="w-full">
                {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Generate Keystore
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-yellow-50 dark:bg-yellow-950 border border-yellow-300 dark:border-yellow-700 rounded p-3 flex gap-2">
                <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                  <strong>Download and save your keystore file permanently.</strong><br />
                  Losing it means you can never update your app on the Play Store.
                </p>
              </div>
              <div className="text-sm space-y-1 bg-muted p-3 rounded font-mono">
                <div>Alias: <span className="font-bold">{keystoreData.keyAlias}</span></div>
                <div>Keystore password: <span className="font-bold">{keystoreData.keystorePassword}</span></div>
                <div>Key password: <span className="font-bold">{keystoreData.keyPassword}</span></div>
              </div>
              <p className="text-xs text-muted-foreground">Save these credentials alongside your keystore file.</p>
              <Button onClick={downloadKeystore} variant="outline" className="w-full gap-2">
                <Download className="w-4 h-4" />
                Download release.jks
              </Button>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setKeystoreDialog(false); setKeystoreData(null) }}>Cancel</Button>
            {keystoreData && (
              <Button onClick={() => {
                setKeystoreAcknowledged(true)
                setKeystoreDialog(false)
                setKeystoreData(null)
                startBuild('android', 'release')
              }}>
                I&apos;ve saved it, continue
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* iOS Signing Dialog */}
      <Dialog open={iosDialog} onOpenChange={setIosDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>iOS Release Signing</DialogTitle>
            <DialogDescription>
              Upload your Apple Developer certificate and provisioning profile.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-yellow-50 dark:bg-yellow-950 border border-yellow-300 dark:border-yellow-700 rounded p-3 flex gap-2">
              <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                iOS builds use macOS runners which consume <strong>10x GitHub Actions minutes</strong>.
              </p>
            </div>
            <div className="space-y-2">
              <Label>Distribution Certificate (.p12)</Label>
              <Input type="file" accept=".p12" onChange={e => setIosFiles(f => ({ ...f, p12: e.target.files[0] }))} />
            </div>
            <div className="space-y-2">
              <Label>Certificate Password</Label>
              <Input type="password" value={iosFiles.password} onChange={e => setIosFiles(f => ({ ...f, password: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Provisioning Profile (.mobileprovision)</Label>
              <Input type="file" accept=".mobileprovision" onChange={e => setIosFiles(f => ({ ...f, provision: e.target.files[0] }))} />
            </div>
            <div className="space-y-2">
              <Label>Xcode Scheme (optional)</Label>
              <Input placeholder="MyApp" value={iosFiles.scheme} onChange={e => setIosFiles(f => ({ ...f, scheme: e.target.value }))} />
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIosDialog(false)}>Cancel</Button>
            <Button onClick={saveIosSigning} disabled={loading || !iosFiles.p12 || !iosFiles.provision}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Save & Build
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Build Failed Dialog */}
      <Dialog open={failedDialog} onOpenChange={setFailedDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-500">
              <XCircle className="w-5 h-5" /> Build Failed
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded p-3 text-sm text-red-700 dark:text-red-300">
              {buildState?.error || 'Build failed. Check the logs for details.'}
            </div>
            {buildState?.runUrl && (
              <a
                href={buildState.runUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-blue-600 hover:underline"
              >
                View full logs on GitHub →
              </a>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFailedDialog(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
