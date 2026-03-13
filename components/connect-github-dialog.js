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

export function ConnectGitHubDialog({ projectId, onConnect }) {
  const [open, setOpen] = useState(false)
  const [repos, setRepos] = useState([])
  const [branches, setBranches] = useState([])
  const [loading, setLoading] = useState(false)
  const [loadingBranches, setLoadingBranches] = useState(false)
  const [connecting, setConnecting] = useState(false)
  const [search, setSearch] = useState('')
  const [selectedRepo, setSelectedRepo] = useState(null)
  const [selectedBranch, setSelectedBranch] = useState('')
  const [error, setError] = useState(null)

  useEffect(() => {
    if (open) {
      fetchRepos()
    }
  }, [open])

  const fetchRepos = async () => {
    setLoading(true)
    setError(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const response = await fetch('/api/github/repos', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      })

      if (!response.ok) {
        throw new Error('Failed to fetch repositories')
      }

      const data = await response.json()
      setRepos(data.repos)
    } catch (err) {
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
        },
      })

      if (!response.ok) {
        throw new Error('Failed to fetch branches')
      }

      const data = await response.json()
      setBranches(data.branches)
      
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

  const handleConnect = async () => {
    if (!selectedRepo || !selectedBranch) return

    setConnecting(true)
    setError(null)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      const response = await fetch(`/api/projects/${projectId}/connect-github`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          repoUrl: selectedRepo.cloneUrl,
          branch: selectedBranch,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to connect repository')
      }

      const data = await response.json()
      setOpen(false)
      onConnect?.(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setConnecting(false)
    }
  }

  const filteredRepos = repos.filter(repo =>
    repo.name.toLowerCase().includes(search.toLowerCase()) ||
    repo.description?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <GitBranch className="w-4 h-4 mr-2" />
          Connect to GitHub
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Connect to GitHub</DialogTitle>
          <DialogDescription>
            Connect this project to a GitHub repository for version control
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded text-sm">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search repositories..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

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
      </DialogContent>
    </Dialog>
  )
}
