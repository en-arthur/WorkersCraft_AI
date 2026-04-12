'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Loader2, Search, Globe, Smartphone, Database, Github, ExternalLink } from 'lucide-react'

import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { useAuth } from '@/lib/auth'
import { ImportGitHubDialog } from '@/components/import-github-dialog'
import Logo from '@/components/logo'
import { Skeleton } from '@/components/ui/skeleton'
import { QRPopover } from '@/components/qr-popover'
import { Card, CardContent } from '@/components/ui/card'

export default function DashboardPage() {
  const router = useRouter()
  const { session } = useAuth()
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [currentStep, setCurrentStep] = useState(1)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [projectToDelete, setProjectToDelete] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [newProject, setNewProject] = useState({ 
    name: '', 
    user_prompt: '',
    platform: 'web',
    tech_stack: 'nextjs-developer',
    backend_enabled: false
  })
  const [saving, setSaving] = useState(false)
  const [isLimitDialogOpen, setIsLimitDialogOpen] = useState(false)
  const [authChecked, setAuthChecked] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  const filteredProjects = useMemo(() => {
    if (!searchQuery.trim()) return projects
    const query = searchQuery.toLowerCase()
    return projects.filter(p => 
      p.name.toLowerCase().includes(query) || 
      p.description?.toLowerCase().includes(query)
    )
  }, [projects, searchQuery])

  const techStacks = {
    web: [
      { id: 'nextjs-developer', name: 'Next.js', icon: '/thirdparty/templates/nextjs-developer.svg' },
    ],
    mobile: [
      { id: 'expo-developer', name: 'Expo (React Native)', icon: '/thirdparty/templates/expo-developer.png' }
    ]
  }

  // Auth protection - redirect to auth if not logged in (after initial check)
  useEffect(() => {
    const timer = setTimeout(() => {
      setAuthChecked(true)
    }, 500)
    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    if (authChecked && !session) {
      router.push('/auth')
    }
  }, [authChecked, session, router])

  // Fire affiliate track if a ref was stored but never sent (e.g. user was already logged in)
  useEffect(() => {
    if (!session?.access_token) return
    const ref = localStorage.getItem('affiliate_ref')
    if (!ref) return
    fetch('/api/affiliates/track', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ ref_code: ref }),
    }).then(() => localStorage.removeItem('affiliate_ref')).catch(() => {})
  }, [session?.access_token])

  useEffect(() => {
    async function fetchProjects() {
      if (!session?.user?.id) return
      
      try {
        setLoading(true)
        const { data: { session: currentSession } } = await supabase.auth.getSession()
        
        const response = await fetch(`/api/projects?user_id=${session.user.id}`, {
          headers: {
            'Authorization': `Bearer ${currentSession?.access_token}`
          }
        })
        const data = await response.json()
        setProjects(data.projects || [])
      } catch (error) {
        console.error('Error loading projects:', error)
      } finally {
        setLoading(false)
      }
    }
    
    fetchProjects()
  }, [session?.user?.id])

  async function loadProjects() {
    try {
      setLoading(true)
      const { data: { session: currentSession } } = await supabase.auth.getSession()
      
      const response = await fetch(`/api/projects?user_id=${session.user.id}`, {
        headers: {
          'Authorization': `Bearer ${currentSession?.access_token}`
        }
      })
      const data = await response.json()
      if (data.projects) {
        setProjects(data.projects)
      }
    } catch (error) {
      console.error('Error loading projects:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleCreateProject() {
    if (!newProject.name.trim() || !newProject.user_prompt.trim()) return

    try {
      setSaving(true)
      
      // Get session token
      const { data: { session: currentSession } } = await supabase.auth.getSession()
      
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentSession?.access_token}`
        },
        body: JSON.stringify({
          user_id: session.user.id,
          name: newProject.name,
          user_prompt: newProject.user_prompt,
          platform: newProject.platform,
          tech_stack: newProject.tech_stack,
          backend_enabled: newProject.backend_enabled,
          description: newProject.user_prompt.slice(0, 100)
        })
      })

      const data = await response.json()
      if (response.status === 402 || data.error === 'subscription_required') {
        router.push('/billing')
        return
      }
      if (response.status === 429 || data.error === 'monthly_limit_reached') {
        setIsLimitDialogOpen(true)
        return
      }
      if (data.project) {
        // If backend enabled, register app with CloudService
        if (newProject.backend_enabled) {
          const { registerAppWithRetry, updateProjectBackendStatus } = await import('@/lib/cloudservice')
          
          const appId = await registerAppWithRetry(
            data.project.id,
            data.project.name,
            session.user.id
          )
          
          if (appId) {
            await updateProjectBackendStatus(data.project.id, 'active', appId)
            data.project.backend_status = 'active'
            data.project.backend_app_id = appId
          } else {
            await updateProjectBackendStatus(data.project.id, 'registration_failed')
            data.project.backend_status = 'registration_failed'
            alert('⚠️ Backend registration failed. You can retry from project settings.')
          }
        }
        
        setProjects([data.project, ...projects])
        setNewProject({ name: '', user_prompt: '', platform: 'web', tech_stack: 'nextjs-developer', backend_enabled: false })
        setIsDialogOpen(false)
        router.push(`/chat?project=${data.project.id}`)
      }
    } catch (error) {
      console.error('Error creating project:', error)
    } finally {
      setSaving(false)
    }
  }

  async function handleDeleteProject(projectId) {
    try {
      setDeleting(true)
      const { data: { session: currentSession } } = await supabase.auth.getSession()
      
      const response = await fetch(`/api/projects/${projectId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${currentSession?.access_token}`
        }
      })

      if (response.ok) {
        setProjects(projects.filter(p => p.id !== projectId))
        setIsDeleteDialogOpen(false)
        setProjectToDelete(null)
      }
    } catch (error) {
      console.error('Error deleting project:', error)
    } finally {
      setDeleting(false)
    }
  }

  function formatDate(dateString) {
    const now = new Date()
    const date = new Date(dateString)
    const diff = Math.floor((now - date) / 1000)
    if (diff < 60) return 'just now'
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
    if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  if (!session) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-16 h-16 rounded-full border-4 border-muted animate-spin" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
              <Logo style="fragments" className="w-8 h-8" />
            </div>
          </div>
          <p className="text-muted-foreground text-sm">Checking authentication...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-full">
      {/* Header */}
      <div className="px-6 md:px-10 py-8 mt-4 border-b bg-muted/20">
        <div className="max-w-6xl mx-auto flex flex-col gap-6">
          {/* Top row: title + actions */}
          <div className="flex items-center justify-between gap-4 px-2">
            <h1 className="text-xl font-semibold">My Projects</h1>
            <div className="flex gap-2">
              {/* <ImportGitHubDialog disabled={saving} onImport={(project) => {
                router.push(`/chat?project=${project.id}`)
              }} /> */}
              <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) setCurrentStep(1) }}>
                <DialogTrigger asChild>
                  <Button size="lg" className="px-8 py-6 text-base">
                    + New Project
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Create New Project</DialogTitle>
                    <DialogDescription>
                      Step {currentStep} of 3
                    </DialogDescription>
                  </DialogHeader>
                  
                  {/* Progress bar */}
                  <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all duration-300"
                      style={{ width: `${(currentStep / 3) * 100}%` }}
                    />
                  </div>

                  <div className="py-4 min-h-[300px]">
                    {/* Step 1: Project Basics */}
                    {currentStep === 1 && (
                      <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                        <div className="space-y-2">
                          <Label htmlFor="name">Project Name *</Label>
                          <Input
                            id="name"
                            value={newProject.name}
                            onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
                            placeholder="My Awesome App"
                            autoFocus
                          />
                        </div>
                        <div className="space-y-3">
                          <Label>Platform *</Label>
                          <div className="grid grid-cols-2 gap-4">
                            <button
                              type="button"
                              onClick={() => setNewProject({ ...newProject, platform: 'web', tech_stack: 'nextjs-developer' })}
                              className={`p-6 rounded-lg border-2 transition-all hover:scale-105 ${
                                newProject.platform === 'web' 
                                  ? 'border-primary bg-primary/5 shadow-lg' 
                                  : 'border-border hover:border-primary/50'
                              }`}
                            >
                              <Globe className="w-8 h-8 mx-auto mb-3 text-primary" />
                              <h3 className="font-semibold mb-1">Web App</h3>
                              <p className="text-xs text-muted-foreground">Next.js</p>
                            </button>
                            <button
                              type="button"
                              onClick={() => setNewProject({ ...newProject, platform: 'mobile', tech_stack: 'expo-developer' })}
                              className={`p-6 rounded-lg border-2 transition-all hover:scale-105 ${
                                newProject.platform === 'mobile' 
                                  ? 'border-primary bg-primary/5 shadow-lg' 
                                  : 'border-border hover:border-primary/50'
                              }`}
                            >
                              <Smartphone className="w-8 h-8 mx-auto mb-3 text-primary" />
                              <h3 className="font-semibold mb-1">Mobile App</h3>
                              <p className="text-xs text-muted-foreground">Expo (React Native)</p>
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Step 2: Features */}
                    {currentStep === 2 && (
                      <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                        <div className="space-y-4">
                          <Label>Features</Label>
                          <div 
                            className={`p-6 rounded-lg border-2 transition-all ${
                              newProject.backend_enabled 
                                ? 'border-primary bg-primary/5 shadow-lg' 
                                : 'border-border'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex items-start gap-4 flex-1">
                                <div className="shrink-0">
                                  <Database className="w-6 h-6 text-primary" />
                                </div>
                                <div className="flex-1">
                                  <h3 className="font-semibold mb-2">Backend Services</h3>
                                  <p className="text-sm text-muted-foreground">
                                    Adds user authentication, database storage, and file uploads to your app
                                  </p>
                                </div>
                              </div>
                              <Switch
                                checked={newProject.backend_enabled}
                                onCheckedChange={(checked) => setNewProject({ ...newProject, backend_enabled: checked })}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Step 3: Describe Your App */}
                    {currentStep === 3 && (
                      <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                        <div className="space-y-2">
                          <Label htmlFor="prompt">What do you want to build? *</Label>
                          <Textarea
                            id="prompt"
                            value={newProject.user_prompt}
                            onChange={(e) => setNewProject({ ...newProject, user_prompt: e.target.value })}
                            placeholder="Build a todo app with dark mode, add/delete tasks, and local storage..."
                            rows={8}
                            autoFocus
                          />
                          <p className="text-xs text-muted-foreground">
                            {newProject.user_prompt.length} characters • Be specific about features, design, and functionality
                          </p>
                        </div>
                        <div className="p-4 rounded-lg bg-muted/50 border">
                          <p className="text-xs font-medium mb-2">💡 Example prompts:</p>
                          <ul className="text-xs text-muted-foreground space-y-1">
                            <li>• A recipe app with search, favorites, and cooking timer</li>
                            <li>• A fitness tracker with workout logging and progress charts</li>
                            <li>• A note-taking app with markdown support and folders</li>
                          </ul>
                        </div>
                      </div>
                    )}
                  </div>

                  <DialogFooter>
                    {currentStep > 1 && (
                      <Button variant="outline" onClick={() => setCurrentStep(currentStep - 1)}>
                        ← Back
                      </Button>
                    )}
                    {currentStep < 3 ? (
                      <Button
                        onClick={() => setCurrentStep(currentStep + 1)}
                        disabled={currentStep === 1 && !newProject.name.trim()}
                      >
                        Next →
                      </Button>
                    ) : (
                      <Button
                        onClick={handleCreateProject}
                        disabled={saving || !newProject.name.trim() || !newProject.user_prompt.trim() || newProject.user_prompt.length < 10}
                      >
                        {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                        {saving ? 'Creating...' : 'Create Project'}
                      </Button>
                    )}
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>
          {/* Bottom row: search + count */}
          <div className="flex flex-col sm:flex-row gap-3 items-center px-2 pb-4">
            <div className="relative flex-1 w-full">
              <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search projects..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 w-full border bg-background"
              />
            </div>
            <p className="text-sm text-muted-foreground shrink-0">
              {filteredProjects.length} of {projects.length} project{projects.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 md:px-8 py-8">
        <div className="max-w-6xl mx-auto">
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => (
                <Card key={i}>
                  <CardContent className="p-4 space-y-3">
                    <Skeleton className="h-5 w-2/3" />
                    <Skeleton className="h-4 w-full" />
                    <div className="flex justify-between">
                      <Skeleton className="h-4 w-16" />
                      <Skeleton className="h-4 w-20" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : filteredProjects.length === 0 && searchQuery ? (
            <div className="text-center py-20 px-8 border-2 border-dashed rounded-lg mx-2">
              <h3 className="text-lg font-semibold mb-2">No projects match &quot;{searchQuery}&quot;</h3>
              <p className="text-muted-foreground mb-4 text-sm">Try a different search term</p>
              <Button variant="outline" onClick={() => setSearchQuery('')}>Clear search</Button>
            </div>
          ) : projects.length === 0 ? (
            <div className="text-center py-20 px-8 border-2 border-dashed rounded-lg mx-2">
              <div className="mx-auto w-16 h-16 mb-4 opacity-50">
                <Logo className="w-full h-full" />
              </div>
              <h3 className="text-lg font-semibold mb-2">No projects yet</h3>
              <p className="text-muted-foreground mb-6">
                Create your first project to start building amazing applications
              </p>
              <Button onClick={() => setIsDialogOpen(true)}>Create Your First Project</Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredProjects.map((project) => (
                <Card
                  key={project.id}
                  onClick={() => router.push(`/chat?project=${project.id}`)}
                  className="group cursor-pointer hover:border-primary/60 hover:shadow-lg hover:-translate-y-0.5 active:scale-[0.98] active:shadow-sm active:translate-y-0 transition-all duration-150"
                >
                  <CardContent className="p-4 flex flex-col gap-3">
                    {/* Top row: name + platform badge */}
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-semibold text-sm leading-tight line-clamp-2 flex-1">{project.name}</span>
                      <Badge variant="secondary" className="shrink-0 flex items-center gap-1 text-xs">
                        {project.platform === 'mobile'
                          ? <><Smartphone className="w-3 h-3" />Mobile</>
                          : <><Globe className="w-3 h-3" />Web</>
                        }
                      </Badge>
                    </div>

                    {/* Description */}
                    <p className="text-xs text-muted-foreground line-clamp-2 flex-1">
                      {project.description || 'No description'}
                    </p>

                    {/* Bottom row: feature badges + updated + actions */}
                    <div className="flex items-center justify-between gap-2 pt-1 border-t">
                      <div className="flex items-center gap-1">
                        {project.github_repo_url && (
                          <Badge variant="outline" className="p-1 h-5 w-5">
                            <Github className="w-3 h-3" />
                          </Badge>
                        )}
                        {project.backend_enabled && (
                          <Badge variant="outline" className="p-1 h-5 w-5">
                            <Database className="w-3 h-3" />
                          </Badge>
                        )}
                        {project.deployed_url && (
                          <Badge variant="outline" className="p-1 h-5 w-5">
                            <ExternalLink className="w-3 h-3" />
                          </Badge>
                        )}
                        <span className="text-xs text-muted-foreground ml-1">{formatDate(project.updated_at)}</span>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                        {/* {project.deployed_url && <QRPopover url={project.deployed_url} />} */}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => { setProjectToDelete(project); setIsDeleteDialogOpen(true) }}
                          className="text-destructive hover:text-destructive hover:bg-destructive/10 h-6 px-2 text-xs"
                        >
                          Delete
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Dialogs */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Project</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{projectToDelete?.name}&quot;? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>Cancel</Button>
            <Button variant="destructive" disabled={deleting} onClick={() => handleDeleteProject(projectToDelete?.id)}>
              {deleting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {deleting ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isLimitDialogOpen} onOpenChange={setIsLimitDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Monthly project limit reached</DialogTitle>
            <DialogDescription>
              You&apos;ve used all your project slots for today. Upgrade your plan to create more projects.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsLimitDialogOpen(false)}>Close</Button>
            <Button onClick={() => router.push('/billing')}>Upgrade plan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
