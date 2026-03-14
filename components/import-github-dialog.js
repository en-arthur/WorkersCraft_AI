'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { GitBranch, Loader2, Search } from 'lucide-react'
import { supabase } from '@/lib/supabase'

export function ImportGitHubDialog({ onImport }) {
  const [open, setOpen] = useState(false)
  const [repos, setRepos] = useState([])
  const [branches, setBranches] = useState([])
  const [loading, setLoading] = useState(false)
  const [loadingBranches, setLoadingBranches] = useState(false)
  const [importing, setImporting] = useState(false)
  const [search, setSearch] = useState('')
  const [selectedRepo, setSelectedRepo] = useState(null)
  const [selectedBranch, setSelectedBranch] = useState('')
  const [error, setError] = useState(null)
  const [needsGitHubAuth, setNeedsGitHubAuth] = useState(false)

  useEffect(() => {
    if (open) {
      checkGitHubAuth()
    }
  }, [open])

  const checkGitHubAuth = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      
      // Check if user signed in with GitHub
      if (!session?.provider_token || session?.user?.app_metadata?.provider !== 'github') {
        setNeedsGitHubAuth(true)
        return
      }
      
      setNeedsGitHubAuth(false)
      fetchRepos()
    } catch (err) {
      setError(err.message)
    }
  }

  const handleGitHubSignIn = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'github',
      options: {
        redirectTo: `${window.location.origin}/dashboard`,
      }
    })
  }

  const fetchRepos = async () => {
    setLoading(true)
    setError(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      console.debug('[ImportGitHub] session provider:', session?.user?.app_metadata?.provider)
      console.debug('[ImportGitHub] has provider_token:', !!session?.provider_token)

      const response = await fetch('/api/github/repos', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'X-GitHub-Token': session.provider_token || '',
        },
      })

      console.debug('[ImportGitHub] /api/github/repos status:', response.status)
      if (!response.ok) {
        const body = await response.json()
        console.error('[ImportGitHub] repos error body:', body)
        throw new Error(body.error || 'Failed to fetch repositories')
      }

      const data = await response.json()
      setRepos(data.repos)
    } catch (err) {
      console.error('[ImportGitHub] fetchRepos error:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const fetchBranches = async (repoUrl) => {
    setLoadingBranches(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const response = await fetch(`/api/github/branches?repo_url=${encodeURIComponent(repoUrl)}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'X-GitHub-Token': session.provider_token || '',
        },
      })

      if (!response.ok) {
        throw new Error('Failed to fetch branches')
      }

      const data = await response.json()
      setBranches(data.branches)
      
      // Set default branch
      const defaultBranch = data.branches.find(b => b.name === selectedRepo.defaultBranch)
      if (defaultBranch) {
        setSelectedBranch(defaultBranch.name)
      } else if (data.branches.length > 0) {
        setSelectedBranch(data.branches[0].name)
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoadingBranches(false)
    }
  }

  const handleRepoSelect = (repo) => {
    setSelectedRepo(repo)
    setSelectedBranch('')
    setBranches([])
    fetchBranches(repo.cloneUrl)
  }

  const handleImport = async () => {
    if (!selectedRepo || !selectedBranch) return

    setImporting(true)
    setError(null)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      const response = await fetch('/api/projects/import-github', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          repoUrl: selectedRepo.cloneUrl,
          repoName: selectedRepo.name,
          branch: selectedBranch,
          description: selectedRepo.description,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to import repository')
      }

      const data = await response.json()
      setOpen(false)
      onImport?.(data.project)
    } catch (err) {
      setError(err.message)
    } finally {
      setImporting(false)
    }
  }

  const filteredRepos = repos.filter(repo =>
    repo.name.toLowerCase().includes(search.toLowerCase()) ||
    repo.description?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <GitBranch className="w-4 h-4 mr-2" />
          Import from GitHub
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import from GitHub</DialogTitle>
          <DialogDescription>
            Select a repository and branch to import into WorkersCraft
          </DialogDescription>
        </DialogHeader>

        {needsGitHubAuth ? (
          <div className="py-8 text-center space-y-4">
            <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
              <GitBranch className="w-8 h-8 text-gray-600" />
            </div>
            <div>
              <h3 className="font-semibold text-lg mb-2">GitHub Authentication Required</h3>
              <p className="text-sm text-muted-foreground mb-4">
                To import repositories from GitHub, you need to sign in with your GitHub account.
              </p>
            </div>
            <Button onClick={handleGitHubSignIn} className="gap-2">
              <GitBranch className="w-4 h-4" />
              Sign in with GitHub
            </Button>
          </div>
        ) : (
          <>
            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded text-sm">
                {error}
              </div>
            )}

            <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search repositories..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Repository List */}
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {filteredRepos.map((repo) => (
                <div
                  key={repo.id}
                  onClick={() => handleRepoSelect(repo)}
                  className={`p-3 border rounded cursor-pointer hover:bg-accent ${
                    selectedRepo?.id === repo.id ? 'border-primary bg-accent' : ''
                  }`}
                >
                  <div className="font-medium">{repo.fullName}</div>
                  {repo.description && (
                    <div className="text-sm text-muted-foreground">{repo.description}</div>
                  )}
                  <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                    {repo.language && <span>{repo.language}</span>}
                    {repo.private && <span className="text-yellow-600">Private</span>}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Branch Selection */}
          {selectedRepo && (
            <div className="space-y-2">
              <Label>Branch</Label>
              {loadingBranches ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Loading branches...
                </div>
              ) : (
                <Select value={selectedBranch} onValueChange={setSelectedBranch}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a branch" />
                  </SelectTrigger>
                  <SelectContent>
                    {branches.map((branch) => (
                      <SelectItem key={branch.name} value={branch.name}>
                        {branch.name}
                        {branch.name === selectedRepo.defaultBranch && ' (default)'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          )}

          {/* Import Button */}
          <Button
            onClick={handleImport}
            disabled={!selectedRepo || !selectedBranch || importing}
            className="w-full"
          >
            {importing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Importing...
              </>
            ) : (
              'Import Repository'
            )}
          </Button>
        </div>
        </>
        )}
      </DialogContent>
    </Dialog>
  )
}
