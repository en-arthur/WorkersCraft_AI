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
import { GitBranch, Loader2, Search, Plus, RefreshCw } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/components/ui/use-toast'

export function ConnectGitHubDialog({ projectId, platform, onConnect, forceOpen, onForceOpenHandled }) {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (forceOpen) {
      setOpen(true)
      onForceOpenHandled?.()
    }
  }, [forceOpen])
  const [repos, setRepos] = useState([])
  const [branches, setBranches] = useState([])
  const [loading, setLoading] = useState(false)
  const [loadingBranches, setLoadingBranches] = useState(false)
  const [connecting, setConnecting] = useState(false)
  const [search, setSearch] = useState('')
  const [selectedRepo, setSelectedRepo] = useState(null)
  const [selectedBranch, setSelectedBranch] = useState('')
  const [error, setError] = useState(null)
  const { toast } = useToast()
  const [needsGitHubAuth, setNeedsGitHubAuth] = useState(false)
  const [newRepoName, setNewRepoName] = useState('')
  const [creatingRepo, setCreatingRepo] = useState(false)
  const [showCreateRepo, setShowCreateRepo] = useState(false)

  useEffect(() => {
    if (open) checkGitHubAuth()
  }, [open])

  const checkGitHubAuth = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.provider_token || session?.user?.app_metadata?.provider !== 'github') {
        // Check if we have a cached token
        const cached = localStorage.getItem('gh_token')
        if (!cached) { setNeedsGitHubAuth(true); return }
      } else {
        // Cache it while we have it
        localStorage.setItem('gh_token', session.provider_token)
      }
      setNeedsGitHubAuth(false)
      fetchRepos()
    } catch (err) {
      toast({ variant: 'destructive', title: 'Error', description: err.message })
    }
  }

  function getGitHubToken(session) {
    return session?.provider_token || localStorage.getItem('gh_token') || ''
  }

  const handleGitHubSignIn = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'github',
      options: { redirectTo: `${window.location.origin}/dashboard`, scopes: 'repo workflow read:user user:email' },
    })
  }

  const fetchRepos = async () => {
    setLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const response = await fetch('/api/github/repos', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'X-GitHub-Token': getGitHubToken(session),
        },
      })
      if (!response.ok) throw new Error('Failed to fetch repositories')
      const data = await response.json()
      setRepos(data.repos)
      return data.repos
    } catch (err) {
      toast({ variant: 'destructive', title: 'Error', description: err.message })
      return []
    } finally {
      setLoading(false)
    }
  }

  const fetchBranches = async (repo) => {
    setLoadingBranches(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const response = await fetch(`/api/github/branches?repo_url=${encodeURIComponent(repo.cloneUrl)}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'X-GitHub-Token': getGitHubToken(session),
        },
      })
      if (!response.ok) throw new Error('Failed to fetch branches')
      const data = await response.json()
      setBranches(data.branches)
      const def = data.branches.find(b => b.name === repo.defaultBranch)
      setSelectedBranch(def ? def.name : data.branches[0]?.name ?? '')
    } catch (err) {
      toast({ variant: 'destructive', title: 'Error', description: err.message })
    } finally {
      setLoadingBranches(false)
    }
  }

  const handleRepoSelect = (repo) => {
    setSelectedRepo(repo)
    setSelectedBranch('')
    setBranches([])
    fetchBranches(repo)
  }

  const handleConnect = async () => {
    if (!selectedRepo || !selectedBranch) return
    setConnecting(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const response = await fetch(`/api/projects/${projectId}/connect-github`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
          'X-GitHub-Token': getGitHubToken(session),
        },
        body: JSON.stringify({ repoUrl: selectedRepo.cloneUrl, branch: selectedBranch }),
      })
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to connect repository')
      }
      const data = await response.json()
      setOpen(false)
      onConnect?.(data)
    } catch (err) {
      toast({ variant: 'destructive', title: 'Error', description: err.message })
    } finally {
      setConnecting(false)
    }
  }

  const handleCreateRepo = async () => {
    if (!newRepoName.trim()) return
    setCreatingRepo(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/api/github/create-repo', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
          'X-GitHub-Token': getGitHubToken(session),
        },
        body: JSON.stringify({ name: newRepoName.trim(), isPrivate: false }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to create repository')

      setShowCreateRepo(false)
      setNewRepoName('')

      // Poll until the new repo appears in the list (GitHub takes a moment to register it)
      let updatedRepos = []
      for (let i = 0; i < 8; i++) {
        await new Promise(r => setTimeout(r, 1000))
        updatedRepos = await fetchRepos()
        const created = updatedRepos.find(r => r.cloneUrl === data.repoUrl)
        if (created) {
          handleRepoSelect(created)
          break
        }
      }
    } catch (err) {
      toast({ variant: 'destructive', title: 'Error', description: err.message })
    } finally {
      setCreatingRepo(false)
    }
  }

  const filteredRepos = repos.filter(repo =>
    repo.name.toLowerCase().includes(search.toLowerCase()) ||
    repo.description?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm">
          <GitBranch className="w-4 h-4 mr-2" />
          Connect to GitHub
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Connect to GitHub</SheetTitle>
          <SheetDescription>
            Connect this project to a GitHub repository for version control
          </SheetDescription>
        </SheetHeader>

        {needsGitHubAuth ? (
          <div className="py-8 text-center space-y-4">
            <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
              <GitBranch className="w-8 h-8 text-gray-600" />
            </div>
            <div>
              <h3 className="font-semibold text-lg mb-2">GitHub Authentication Required</h3>
              <p className="text-sm text-muted-foreground mb-4">
                To connect to GitHub repositories, you need to sign in with your GitHub account.
              </p>
            </div>
            <Button onClick={handleGitHubSignIn} className="gap-2">
              <GitBranch className="w-4 h-4" />
              Sign in with GitHub
            </Button>
          </div>
        ) : (
          <div className="space-y-4 mt-4">

            {platform === 'mobile' && (
              <div className="border rounded p-3 space-y-2">
                <button
                  className="flex items-center gap-2 text-sm font-medium w-full text-left"
                  onClick={() => setShowCreateRepo(!showCreateRepo)}
                >
                  <Plus className="w-4 h-4" />
                  Create new repository
                </button>
                {showCreateRepo && (
                  <div className="flex gap-2 pt-1">
                    <Input
                      placeholder="my-expo-app"
                      value={newRepoName}
                      onChange={e => setNewRepoName(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleCreateRepo()}
                    />
                    <Button onClick={handleCreateRepo} disabled={creatingRepo || !newRepoName.trim()} size="sm">
                      {creatingRepo ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create'}
                    </Button>
                  </div>
                )}
              </div>
            )}

            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search repositories..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 pr-10"
              />
              <button
                onClick={fetchRepos}
                className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
                title="Refresh repositories"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              </button>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
            ) : (
              <div className="space-y-2 max-h-72 overflow-y-auto">
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

            <Button
              onClick={handleConnect}
              disabled={!selectedRepo || !selectedBranch || connecting}
              className="w-full"
            >
              {connecting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Connecting...
                </>
              ) : (
                'Connect Repository'
              )}
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}
