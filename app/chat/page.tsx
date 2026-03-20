'use client'

import { ViewType } from '@/components/auth'
import { AuthDialog } from '@/components/auth-dialog'
import { Chat } from '@/components/chat'
import { ChatInput } from '@/components/chat-input'
import { ChatPicker } from '@/components/chat-picker'
import { ChatSettings } from '@/components/chat-settings'
import { NavBar } from '@/components/navbar'
import { Preview } from '@/components/preview'
import { useAuth } from '@/lib/auth'
import { Message, toAISDKMessages, toMessageImage } from '@/lib/messages'
import { LLMModelConfig } from '@/lib/models'
import modelsList from '@/lib/models.json'
import { FragmentSchema, fragmentSchema as schema } from '@/lib/schema'
import { supabase } from '@/lib/supabase'
import templates from '@/lib/templates'
import { ExecutionResult } from '@/lib/types'
import { DeepPartial } from 'ai'
import { experimental_useObject as useObject } from 'ai/react'
import { usePostHog } from 'posthog-js/react'
import { SetStateAction, useEffect, useState, Suspense } from 'react'
import { useLocalStorage } from 'usehooks-ts'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useRouter, useSearchParams } from 'next/navigation'
import Logo from '@/components/logo'

function ChatContent() {
  const [chatInput, setChatInput] = useLocalStorage('chat', '')
  const [files, setFiles] = useState<File[]>([])
  const [selectedTemplate, setSelectedTemplate] = useState<string>(
    'auto',
  )
  const [languageModel, setLanguageModel] = useLocalStorage<LLMModelConfig>(
    'languageModel',
    {
      model: 'models/gemini-3-flash-preview',
    },
  )

  const posthog = usePostHog()

  const [result, setResult] = useState<ExecutionResult>()
  const [messages, setMessages] = useState<Message[]>([])
  const [fragment, setFragment] = useState<DeepPartial<FragmentSchema>>()
  const [currentTab, setCurrentTab] = useState<'code' | 'fragment' | 'backend'>('code')
  const [isPreviewLoading, setIsPreviewLoading] = useState(false)
  const [isProjectLoading, setIsProjectLoading] = useState(false)
  const [isAuthDialogOpen, setAuthDialog] = useState(false)
  const [authView, setAuthView] = useState<ViewType>('sign_in')
  const [isRateLimited, setIsRateLimited] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const { session, userTeam } = useAuth(setAuthDialog, setAuthView)
  const [useMorphApply, setUseMorphApply] = useLocalStorage(
    'useMorphApply',
    true,  // Enabled by default
  )
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [currentProject, setCurrentProject] = useState<{ 
    id: string; 
    name: string; 
    description?: string;
    platform?: string;
    github_repo_url?: string;
    github_branch?: string;
    backend_enabled?: boolean;
    backend_status?: string;
    backend_app_id?: string;
  } | null>(null)
  const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false)
  const [newProject, setNewProject] = useState({ name: '', description: '' })
  const [saving, setSaving] = useState(false)
  const [authChecked, setAuthChecked] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()

  const filteredModels = modelsList.models.filter((model) => {
    if (process.env.NEXT_PUBLIC_HIDE_LOCAL_MODELS) {
      return model.providerId !== 'ollama'
    }
    return true
  })

  const defaultModel = filteredModels.find(
    (model) => model.id === 'models/gemini-3-flash-preview',
  ) || filteredModels[0]

  const currentModel = filteredModels.find(
    (model) => model.id === languageModel.model,
  ) || defaultModel

  // Update localStorage if stored model no longer exists
  useEffect(() => {
    if (languageModel.model && !filteredModels.find((m) => m.id === languageModel.model)) {
      setLanguageModel({ ...languageModel, model: defaultModel.id })
    }
  }, [languageModel.model])

  // Auth check delay
  useEffect(() => {
    const timer = setTimeout(() => {
      setAuthChecked(true)
    }, 500)
    return () => clearTimeout(timer)
  }, [])

  // Auth protection - redirect to auth if not logged in (after initial check)
  useEffect(() => {
    if (authChecked && !session) {
      router.push('/auth')
    }
  }, [session, router])

  const currentTemplate =
    selectedTemplate === 'auto'
      ? templates
      : { [selectedTemplate]: templates[selectedTemplate] }
  const lastMessage = messages[messages.length - 1]

  // Detect if user wants to create/add/delete files (can't use Morph for these)
  const userMessage = typeof lastMessage?.content === 'string'
    ? lastMessage.content
    : Array.isArray(lastMessage?.content)
    ? lastMessage.content.map(c => c.type === 'text' ? c.text : '').join(' ')
    : ''
  
  const isCreatingFiles = /\b(add|create|new|make)\b/i.test(userMessage)
  const isDeletingFiles = /\b(delete|remove)\s+file/i.test(userMessage)
  const isRenamingFiles = /\b(rename|move)\s+file/i.test(userMessage)
  const isPureEdit = !isCreatingFiles && !isDeletingFiles && !isRenamingFiles

  // Determine which API to use based on morph toggle and existing fragment
  const hasFragment = fragment && (
    (fragment.code && fragment.file_path) ||
    (fragment.files && fragment.files.length > 0)
  )
  const shouldUseMorph = useMorphApply && hasFragment && isPureEdit
  const apiEndpoint = shouldUseMorph ? '/api/morph-chat' : '/api/chat'

  const { object, submit, isLoading, stop, error } = useObject({
    api: apiEndpoint,
    schema,
    onError: (error) => {
      console.error('Error submitting request:', error)
      if (error.message.includes('limit')) {
        setIsRateLimited(true)
      }

      setErrorMessage(error.message)
    },
    onFinish: async ({ object: fragment, error }) => {
      if (!error) {
        // send it to /api/sandbox
        console.log('fragment', fragment)
        setIsPreviewLoading(true)
        posthog.capture('fragment_generated', {
          template: fragment?.template,
        })

        // Add backend info to fragment
        const fragmentWithBackend = {
          ...fragment,
          backend_enabled: currentProject?.backend_enabled || false,
          backend_status: currentProject?.backend_status || 'inactive',
          backend_app_id: currentProject?.backend_app_id || undefined,
        }

        const response = await fetch('/api/sandbox', {
          method: 'POST',
          body: JSON.stringify({
            fragment: fragmentWithBackend,
            userID: session?.user?.id,
            teamID: userTeam?.id,
            accessToken: session?.access_token,
          }),
        })

        const result = await response.json()
        console.log('result', result)
        posthog.capture('sandbox_created', { url: result.url })

        setResult(result)
        setCurrentPreview({ fragment: fragmentWithBackend, result })
        setMessage({ result })
        setCurrentTab('fragment')
        setIsPreviewLoading(false)
      }
    },
  })

  useEffect(() => {
    if (object) {
      setFragment(object)
      
      // Get code content from either format
      const codeContent = (object.files && object.files.length > 0 && object.files[0]
        ? object.files[0].file_content
        : object.code) || ''
      
      const content: Message['content'] = [
        { type: 'text', text: object.commentary || '' },
        { type: 'code', text: codeContent },
      ]

      if (!lastMessage || lastMessage.role !== 'assistant') {
        addMessage({
          role: 'assistant',
          content,
          object,
        })
      }

      if (lastMessage && lastMessage.role === 'assistant') {
        setMessage({
          content,
          object,
        })
      }
    }
  }, [object])

  useEffect(() => {
    if (error) stop()
  }, [error])

  function setMessage(message: Partial<Message>, index?: number) {
    setMessages((previousMessages) => {
      const updatedMessages = [...previousMessages]
      updatedMessages[index ?? previousMessages.length - 1] = {
        ...previousMessages[index ?? previousMessages.length - 1],
        ...message,
      }

      return updatedMessages
    })
  }

  async function handleSubmitAuth(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()

    if (!session) {
      return setAuthDialog(true)
    }

    if (isLoading) {
      stop()
    }

    const content: Message['content'] = [{ type: 'text', text: chatInput }]
    const images = await toMessageImage(files)

    if (images.length > 0) {
      images.forEach((image) => {
        content.push({ type: 'image', image })
      })
    }

    const updatedMessages = addMessage({
      role: 'user',
      content,
    })

    console.log('Using API:', apiEndpoint, '| Pure edit:', isPureEdit, '| Has fragment:', hasFragment)

    submit({
      userID: session?.user?.id,
      teamID: userTeam?.id,
      messages: toAISDKMessages(updatedMessages),
      template: currentTemplate,
      model: currentModel,
      config: languageModel,
      ...(shouldUseMorph && fragment ? { currentFragment: fragment } : {}),
      backendEnabled: currentProject?.backend_enabled || false,
      backendStatus: currentProject?.backend_status || 'inactive',
    })

    setChatInput('')
    setFiles([])
    setCurrentTab('code')

    posthog.capture('chat_submit', {
      template: selectedTemplate,
      model: languageModel.model,
    })
  }

  function retry() {
    submit({
      userID: session?.user?.id,
      teamID: userTeam?.id,
      messages: toAISDKMessages(messages),
      template: currentTemplate,
      model: currentModel,
      config: languageModel,
      ...(shouldUseMorph && fragment ? { currentFragment: fragment } : {}),
      backendEnabled: currentProject?.backend_enabled || false,
      backendStatus: currentProject?.backend_status || 'inactive',
    })
  }

  // Load project from URL if specified
  useEffect(() => {
    if (!authChecked || !session?.user?.id) return
    
    const projectId = searchParams.get('project')
    if (projectId) {
      console.log('Loading project from URL:', projectId)
      loadProject(projectId)
    }
  }, [authChecked, session?.user?.id])

  // Auto-save when fragment or messages change
  useEffect(() => {
    if (!currentProject?.id || !fragment || !session?.user?.id) return
    
    const autoSaveTimer = setTimeout(() => {
      saveProjectSilently()
    }, 3000) // Auto-save after 3 seconds of inactivity
    
    return () => clearTimeout(autoSaveTimer)
  }, [fragment, messages, currentProject?.id, session?.user?.id])

  async function saveProjectSilently() {
    if (!fragment || !session?.user?.id || !supabase || !currentProject?.id) return
    
    try {
      const { data: { session: currentSession } } = await supabase.auth.getSession()
      
      // Save new version
      await fetch(`/api/projects/${currentProject.id}/versions`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentSession?.access_token}`
        },
        body: JSON.stringify({ fragment_data: fragment })
      })

      // Save conversation
      await fetch(`/api/projects/${currentProject.id}/conversations`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentSession?.access_token}`
        },
        body: JSON.stringify({ messages })
      })
    } catch (error) {
      console.error('Auto-save error:', error)
    }
  }

  async function loadProject(projectId: string) {
    if (!supabase) return
    setIsProjectLoading(true)
    try {
      const { data: { session: currentSession } } = await supabase.auth.getSession()
      
      console.log('Loading project:', projectId)
      
      const response = await fetch(`/api/projects/${projectId}`, {
        headers: {
          'Authorization': `Bearer ${currentSession?.access_token}`
        }
      })
      const data = await response.json()
      
      console.log('Project data received:', data)
      
      if (data.error) {
        console.error('Error loading project:', data.error)
        alert(`Failed to load project: ${data.error}`)
        return
      }
      
      // Always set the current project
      if (data.project) {
        setCurrentProject(data.project)
        console.log('Set current project:', data.project)
        
        // Set tech stack template if available
        if (data.project.tech_stack) {
          setSelectedTemplate(data.project.tech_stack)
          console.log('Set template to:', data.project.tech_stack)
        }
        
        // Auto-start generation with user prompt if available and no messages yet
        if (data.project.user_prompt && messages.length === 0 && !data.conversation) {
          console.log('Auto-starting with prompt:', data.project.user_prompt)
          setChatInput(data.project.user_prompt)
          // Trigger generation after a short delay
          setTimeout(() => {
            const submitButton = document.querySelector('[type="submit"]') as HTMLButtonElement
            if (submitButton) submitButton.click()
          }, 500)
          return // Don't load old data if we're starting fresh
        }
      }
      
      // Load fragment if available
      if (data.latest_version?.fragment_data) {
        const rawFragment = data.latest_version.fragment_data

        // Normalize imported files to match schema (add file_name if missing)
        const normalizedFragment = {
          ...rawFragment,
          title: rawFragment.title || data.project?.name || 'Imported Project',
          commentary: rawFragment.commentary || '',
          description: rawFragment.description || '',
          additional_dependencies: rawFragment.additional_dependencies || [],
          has_additional_dependencies: rawFragment.has_additional_dependencies || false,
          install_dependencies_command: rawFragment.install_dependencies_command || '',
          port: rawFragment.port ?? null,
          files: rawFragment.files?.map((f: any) => ({
            file_name: f.file_name || f.file_path?.split('/').pop() || 'file',
            file_path: f.file_path,
            file_content: f.file_content,
          })),
        }

        setFragment(normalizedFragment)
        console.log('Loaded fragment data')
        
        // Run the fragment in sandbox to show preview
        setIsPreviewLoading(true)
        try {
          const sandboxResponse = await fetch('/api/sandbox', {
            method: 'POST',
            body: JSON.stringify({
              fragment: normalizedFragment,
              userID: session?.user?.id,
              teamID: userTeam?.id,
              accessToken: session?.access_token,
              githubToken: session?.provider_token ?? undefined,
            }),
          })
          
          const result = await sandboxResponse.json()
          console.log('Sandbox result:', result)
          setResult(result)
          setCurrentTab('fragment')
        } catch (error) {
          console.error('Error running sandbox:', error)
        } finally {
          setIsPreviewLoading(false)
        }
      } else {
        console.log('No fragment data found - new project')
      }
      
      // Load messages from latest conversation if available
      if (data.conversations?.[0]?.messages) {
        setMessages(data.conversations[0].messages)
        console.log('Loaded messages:', data.conversations[0].messages.length)
      } else {
        console.log('No conversation history found')
      }
    } catch (error) {
      console.error('Error loading project:', error)
      alert(`Failed to load project: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsProjectLoading(false)
    }
  }

  async function saveProject() {
    if (!fragment || !session?.user?.id || !supabase) return

    try {
      setSaving(true)
      const { data: { session: currentSession } } = await supabase.auth.getSession()
      
      if (currentProject) {
        // Save new version
        await fetch(`/api/projects/${currentProject.id}/versions`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${currentSession?.access_token}`
          },
          body: JSON.stringify({ fragment_data: fragment })
        })

        // Save conversation
        await fetch(`/api/projects/${currentProject.id}/conversations`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${currentSession?.access_token}`
          },
          body: JSON.stringify({ messages })
        })

        alert('Project saved successfully!')
      } else {
        // Create new project
        const response = await fetch('/api/projects', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${currentSession?.access_token}`
          },
          body: JSON.stringify({
            user_id: session.user.id,
            name: newProject.name || 'Untitled Project',
            description: newProject.description,
            fragment_data: fragment
          })
        })

        const data = await response.json()
        if (data.project) {
          setCurrentProject(data.project)
          setNewProject({ name: '', description: '' })
          setIsSaveDialogOpen(false)
          alert('Project created successfully!')
        }
      }
    } catch (error) {
      console.error('Error saving project:', error)
      alert('Error saving project')
    } finally {
      setSaving(false)
    }
  }

  function addMessage(message: Message) {
    setMessages((previousMessages) => [...previousMessages, message])
    return [...messages, message]
  }

  function handleSaveInputChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setChatInput(e.target.value)
  }

  function handleFileChange(change: SetStateAction<File[]>) {
    setFiles(change)
  }

  function logout() {
    if (supabase) {
      supabase.auth.signOut().then(() => {
        router.push('/')
      })
    } else {
      console.warn('Supabase is not initialized')
    }
  }

  function handleLanguageModelChange(e: LLMModelConfig) {
    setLanguageModel({ ...languageModel, ...e })
  }

  function handleClearChat() {
    stop()
    setChatInput('')
    setFiles([])
    setMessages([])
    setFragment(undefined)
    setResult(undefined)
    setCurrentTab('code')
    setIsPreviewLoading(false)
    setIsFullscreen(false)
  }

  function setCurrentPreview(preview: {
    fragment: DeepPartial<FragmentSchema> | undefined
    result: ExecutionResult | undefined
  }) {
    setFragment(preview.fragment)
    setResult(preview.result)
  }

  function handleUndo() {
    setMessages((previousMessages) => [...previousMessages.slice(0, -2)])
    setCurrentPreview({ fragment: undefined, result: undefined })
  }

  function toggleFullscreen() {
    setIsFullscreen(!isFullscreen)
  }

  // Show loading while checking auth
  if (!session) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-16 h-16 rounded-full border-4 border-muted animate-spin" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
              <Logo style="fragments" className="w-8 h-8" />
            </div>
          </div>
          <p className="text-muted-foreground text-sm">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <main className="flex min-h-screen max-h-screen">
      {supabase && (
        <AuthDialog
          open={isAuthDialogOpen}
          setOpen={setAuthDialog}
          view={authView}
          supabase={supabase}
        />
      )}
      <div className={`grid w-full transition-all duration-300 ${isFullscreen ? 'grid-cols-1' : 'md:grid-cols-2'}`}>
        <div
          className={`flex flex-col w-full max-h-full max-w-[800px] mx-auto px-4 overflow-auto transition-all duration-300 ${isFullscreen ? 'hidden' : 'block'} ${fragment ? 'col-span-1' : 'col-span-2'}`}
        >
          {isProjectLoading && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/80 backdrop-blur-sm">
              <div className="flex flex-col items-center gap-3">
                <div className="w-8 h-8 rounded-full border-4 border-muted border-t-primary animate-spin" />
                <p className="text-sm text-muted-foreground">Loading project...</p>
              </div>
            </div>
          )}
          <NavBar
            session={session}
            showLogin={() => setAuthDialog(true)}
            signOut={logout}
            canUndo={messages.length > 1 && !isLoading}
            onUndo={handleUndo}
            projectId={currentProject?.id}
            platform={currentProject?.platform}
            fragment={fragment}
            sandboxId={result?.sbxId}
            isPreviewLoading={isPreviewLoading}
            hasGitHubRepo={!!(fragment?.github_repo_url || currentProject?.github_repo_url)}
            githubRepoUrl={fragment?.github_repo_url || currentProject?.github_repo_url}
            githubBranch={fragment?.github_branch || currentProject?.github_branch}
            onGitHubConnect={(data?: { github_repo_url?: string; github_branch?: string }) => {
              if (data?.github_repo_url) {
                setCurrentProject(prev => prev ? { ...prev, github_repo_url: data.github_repo_url, github_branch: data.github_branch } : prev)
                setFragment(prev => prev ? { ...prev, github_repo_url: data.github_repo_url, github_branch: data.github_branch } : prev)
              }
              if (currentProject?.id) loadProject(currentProject.id)
            }}
            onGitHubPush={() => {
              if (currentProject?.id) {
                loadProject(currentProject.id)
              }
            }}
            onGitHubDisconnect={() => {
              if (currentProject?.id) {
                loadProject(currentProject.id)
              }
            }}
          />
          <Chat
            messages={messages}
            isLoading={isLoading}
            setCurrentPreview={setCurrentPreview}
          />
          <ChatInput
            retry={retry}
            isErrored={error !== undefined}
            errorMessage={errorMessage}
            isLoading={isLoading}
            isRateLimited={isRateLimited}
            stop={stop}
            input={chatInput}
            handleInputChange={handleSaveInputChange}
            handleSubmit={handleSubmitAuth}
            isMultiModal={currentModel?.multiModal || false}
            files={files}
            handleFileChange={handleFileChange}
          >
            <ChatPicker
              templates={templates}
              selectedTemplate={selectedTemplate}
              onSelectedTemplateChange={setSelectedTemplate}
              models={filteredModels}
              languageModel={languageModel}
              onLanguageModelChange={handleLanguageModelChange}
            />
            <ChatSettings
              languageModel={languageModel}
              onLanguageModelChange={handleLanguageModelChange}
              apiKeyConfigurable={!process.env.NEXT_PUBLIC_NO_API_KEY_INPUT}
              baseURLConfigurable={!process.env.NEXT_PUBLIC_NO_BASE_URL_INPUT}
              useMorphApply={useMorphApply}
              onUseMorphApplyChange={setUseMorphApply}
            />
          </ChatInput>
        </div>
        <Preview
          teamID={userTeam?.id}
          accessToken={session?.access_token}
          selectedTab={currentTab}
          onSelectedTabChange={setCurrentTab}
          isChatLoading={isLoading}
          isPreviewLoading={isPreviewLoading}
          fragment={fragment}
          result={result as ExecutionResult}
          onClose={() => {
            setFragment(undefined)
            setIsFullscreen(false)
          }}
          isFullscreen={isFullscreen}
          onToggleFullscreen={toggleFullscreen}
          projectId={currentProject?.id}
          backendAppId={currentProject?.backend_app_id}
          onGitHubConnect={() => {
            if (currentProject?.id) {
              loadProject(currentProject.id)
            }
          }}
        />
      </div>

      {/* Save Project Dialog */}
      <Dialog open={isSaveDialogOpen} onOpenChange={setIsSaveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {currentProject ? 'Save Project' : 'Create New Project'}
            </DialogTitle>
            <DialogDescription>
              {currentProject 
                ? 'Save a new version of your project'
                : 'Give your project a name and optional description.'
              }
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {!currentProject && (
              <>
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
                  <Label htmlFor="description">Description (optional)</Label>
                  <Textarea
                    id="description"
                    value={newProject.description}
                    onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
                    placeholder="A brief description of your project..."
                    rows={3}
                  />
                </div>
              </>
            )}
            {currentProject && (
              <div className="text-sm text-muted-foreground">
                Project: <span className="font-medium">{currentProject.name}</span>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsSaveDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={saveProject} disabled={saving || (!currentProject && !newProject.name.trim())}>
              {saving ? 'Saving...' : currentProject ? 'Save Version' : 'Create Project'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  )
}

export default function Home() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <ChatContent />
    </Suspense>
  )
}
