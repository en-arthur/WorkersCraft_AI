'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
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
        redirectTo: `${window.location.origin}/auth/callback`,
        scopes: 'repo read:user user:email',
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
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline">
          <GitBranch className="w-4 h-4 mr-2" />
          Import from GitHub
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="flex flex-col w-full sm:max-w-lg p-0 gap-0">
        <SheetHeader className="px-6 pt-6 pb-3 border-b shrink-0">
          <SheetTitle className="flex items-center gap-2">
            <GitBranch className="w-5 h-5" />
            Import from GitHub
          </SheetTitle>
          <SheetDescription>
            Select a repository and branch to import into WorkersCraft
          </SheetDescription>
        </SheetHeader>

        {needsGitHubAuth ? (
          <div className="flex flex-col items-center justify-center flex-1 py-12 px-6 text-center gap-4">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center">
              <GitBranch className="w-8 h-8 text-muted-foreground" />
            </div>
            <div>
              <h3 className="font-semibold text-lg mb-1">GitHub Authentication Required</h3>
              <p className="text-sm text-muted-foreground">
                Sign in with GitHub to access your repositories.
              </p>
            </div>
            <Button onClick={handleGitHubSignIn} className="gap-2 mt-2">
              <GitBranch className="w-4 h-4" />
              Sign in with GitHub
            </Button>
          </div>
        ) : (
          <>
            {/* Search — pinned */}
            <div className="px-6 py-3 border-b shrink-0">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search repositories..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            {/* Repo list — scrollable middle */}
            <div className="flex-1 overflow-y-auto px-6 py-3 min-h-0">
              {error && (
                <div className="bg-destructive/10 text-destructive p-3 rounded-md text-sm mb-3">
                  {error}
                </div>
              )}
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : filteredRepos.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground py-12">No repositories found.</p>
              ) : (
                <div className="space-y-2">
                  {filteredRepos.map((repo) => (
                    <div
                      key={repo.id}
                      onClick={() => handleRepoSelect(repo)}
                      className={`p-3 border rounded-lg cursor-pointer transition-colors hover:bg-accent ${
                        selectedRepo?.id === repo.id ? 'border-primary bg-accent' : 'border-border'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium text-sm truncate">{repo.fullName}</span>
                        {repo.private && (
                          <span className="text-xs bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded shrink-0">Private</span>
                        )}
                      </div>
                      {repo.description && (
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{repo.description}</p>
                      )}
                      {repo.language && (
                        <span className="text-xs text-muted-foreground mt-1 inline-block">{repo.language}</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Branch + Import — pinned footer */}
            <div className="px-6 py-4 border-t shrink-0 space-y-3 bg-background mt-auto">
              {selectedRepo && (
                <div className="space-y-1.5">
                  <Label>Branch</Label>
                  {loadingBranches ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground h-10">
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
      </SheetContent>
    </Sheet>
  )
}
