'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useAuth } from '@/lib/auth'
import Logo from '@/components/logo'

export default function DashboardPage() {
  const router = useRouter()
  const { session } = useAuth()
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [projectToDelete, setProjectToDelete] = useState(null)
  const [newProject, setNewProject] = useState({ 
    name: '', 
    user_prompt: '',
    platform: 'web',
    tech_stack: 'nextjs-developer'
  })
  const [saving, setSaving] = useState(false)
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
          description: newProject.user_prompt.slice(0, 100) // Auto-generate short description
        })
      })

      const data = await response.json()
      if (data.project) {
        setProjects([data.project, ...projects])
        setNewProject({ name: '', user_prompt: '', platform: 'web', tech_stack: 'nextjs-developer' })
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

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-16 h-16 rounded-full border-4 border-muted animate-spin" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
              <Logo style="fragments" className="w-8 h-8" />
            </div>
          </div>
          <p className="text-muted-foreground text-sm">Loading projects...</p>
        </div>
      </div>
    )
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
    <div className="p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold">My Projects</h1>
            <p className="text-muted-foreground mt-1">
              {projects.length} project{projects.length !== 1 ? 's' : ''}
            </p>
          </div>
          
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
                  Describe what you want to build and we'll help you create it
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
                    Describe your project in detail. The AI will use this to generate your code.
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

        {projects.length === 0 ? (
          <div className="text-center py-16 border-2 border-dashed rounded-lg">
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
                onClick={() => handleDeleteProject(projectToDelete?.id)}
              >
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
