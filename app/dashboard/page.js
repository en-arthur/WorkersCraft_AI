'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useAuth } from '@/lib/auth'
import { ImportGitHubDialog } from '@/components/import-github-dialog'
import Logo from '@/components/logo'
import { Skeleton } from '@/components/ui/skeleton'

export default function DashboardPage() {
  const router = useRouter()
  const { session } = useAuth()
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
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

  const techStacks = {
    web: [
      { id: 'nextjs-developer', name: 'Next.js', icon: '⚡' },
      { id: 'vue-developer', name: 'Vue.js', icon: '💚' },
      { id: 'streamlit-developer', name: 'Streamlit', icon: '🐍' },
      { id: 'gradio-developer', name: 'Gradio', icon: '🤖' }
    ],
    mobile: [
      { id: 'expo-developer', name: 'Expo (React Native)', icon: '📱' }
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
      if (response.status === 429 || data.error === 'daily_limit_reached') {
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
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
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
    <div className="h-screen flex flex-col overflow-hidden">
      {/* Fixed header */}
      <div className="flex-shrink-0 px-6 md:px-10 pt-8 pb-5 border-b">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold">My Projects</h1>
            <p className="text-muted-foreground mt-1">
              {projects.length} project{projects.length !== 1 ? 's' : ''}
            </p>
          </div>
          <div className="flex gap-2">
            <ImportGitHubDialog disabled={saving} onImport={(project) => {
              router.push(`/chat?project=${project.id}`)
            }} />
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button size="lg" className="px-8 py-6 text-base">
                  + New Project
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create New Project</DialogTitle>
                <DialogDescription>
                  Describe what you want to build and we&apos;ll help you create it
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Project Name *</Label>
                  <Input
                    id="name"
                    value={newProject.name}
                    onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
                    placeholder="My Awesome App"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="prompt">What do you want to build? *</Label>
                  <Textarea
                    id="prompt"
                    value={newProject.user_prompt}
                    onChange={(e) => setNewProject({ ...newProject, user_prompt: e.target.value })}
                    placeholder="Build a todo app with dark mode, add/delete tasks, and local storage..."
                    rows={5}
                  />
                  <p className="text-xs text-muted-foreground">
                    Describe your project in detail.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>Platform *</Label>
                  <RadioGroup 
                    value={newProject.platform} 
                    onValueChange={(value) => {
                      const defaultStack = value === 'web' ? 'nextjs-developer' : 'expo-developer'
                      setNewProject({ ...newProject, platform: value, tech_stack: defaultStack })
                    }}
                    className="flex flex-row gap-4"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="web" id="web" />
                      <Label htmlFor="web" className="cursor-pointer">Web App</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="mobile" id="mobile" />
                      <Label htmlFor="mobile" className="cursor-pointer">Mobile App</Label>
                    </div>
                  </RadioGroup>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tech-stack">Tech Stack *</Label>
                  <Select 
                    value={newProject.tech_stack} 
                    onValueChange={(value) => setNewProject({ ...newProject, tech_stack: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {techStacks[newProject.platform].map(stack => (
                        <SelectItem key={stack.id} value={stack.id}>
                          {stack.icon} {stack.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="backend"
                      checked={newProject.backend_enabled}
                      onChange={(e) => setNewProject({ ...newProject, backend_enabled: e.target.checked })}
                      className="w-4 h-4"
                    />
                    <Label htmlFor="backend" className="cursor-pointer">
                      Enable Backend (Authentication & Database)
                    </Label>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Adds user authentication, data storage, and file uploads to your app
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleCreateProject} 
                  disabled={saving || !newProject.name.trim() || !newProject.user_prompt.trim() || newProject.user_prompt.length < 10}
                >
                  {saving ? 'Creating...' : 'Create & Start Building →'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          </div>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-4 md:px-8 py-6">
        <div className="max-w-6xl mx-auto">
          {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="border rounded-lg p-4 space-y-3">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
                <div className="flex justify-between pt-2">
                  <Skeleton className="h-8 w-16" />
                  <Skeleton className="h-8 w-16" />
                </div>
              </div>
            ))}
          </div>
        ) : projects.length === 0 ? (
          <div className="text-center py-20 px-8 border-2 border-dashed rounded-lg mx-2">
            <div className="mx-auto w-12 h-12 text-muted-foreground mb-4">
              <Logo style="fragments" className="w-full h-full" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No projects yet</h3>
            <p className="text-muted-foreground mb-6">
              Create your first project to start building amazing applications
            </p>
            <Button onClick={() => setIsDialogOpen(true)}>
              Create Your First Project
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map((project) => (
              <Card key={project.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle className="truncate">{project.name}</CardTitle>
                  <CardDescription>
                    Updated {formatDate(project.updated_at)}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {project.description || 'No description'}
                  </p>
                </CardContent>
                <CardFooter className="flex justify-between">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => router.push(`/chat?project=${project.id}`)}
                  >
                    Open
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setProjectToDelete(project)
                      setIsDeleteDialogOpen(true)
                    }}
                    className="text-destructive hover:text-destructive"
                  >
                    Delete
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
        
        {/* Delete Confirmation Dialog */}
        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Project</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete &quot;{projectToDelete?.name}&quot;? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                variant="destructive" 
                disabled={deleting}
                onClick={() => handleDeleteProject(projectToDelete?.id)}
              >
                {deleting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {deleting ? 'Deleting...' : 'Delete'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={isLimitDialogOpen} onOpenChange={setIsLimitDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Daily project limit reached</DialogTitle>
              <DialogDescription>
                You&apos;ve used all your project slots for today. Upgrade your plan to create more projects.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsLimitDialogOpen(false)}>
                Close
              </Button>
              <Button onClick={() => router.push('/billing')}>
                Upgrade plan
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        </div>
      </div>
    </div>
  )
}
