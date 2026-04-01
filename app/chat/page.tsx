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
import { SetStateAction, useEffect, useRef, useState, Suspense } from 'react'
import { useLocalStorage } from 'usehooks-ts'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useRouter, useSearchParams } from 'next/navigation'
import Logo from '@/components/logo'
import { useToast } from '@/components/ui/use-toast'
import { getTemplateById } from '@/lib/project-templates'

function ChatContent() {
  const { toast } = useToast()
  const [chatInput, setChatInput] = useLocalStorage('chat', '')
  const [files, setFiles] = useState<File[]>([])
  const [selectedTemplate, setSelectedTemplate] = useState<string>(
    'auto',
  )
  const [languageModel, setLanguageModel] = useLocalStorage<LLMModelConfig>(
    'languageModel',
    {
      model: process.env.NEXT_PUBLIC_DEFAULT_MODEL_ID || 'models/gemini-3-flash-preview',
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
  const currentProjectRef = useRef(currentProject)
  useEffect(() => { currentProjectRef.current = currentProject }, [currentProject])
  const isInitialLoadRef = useRef(true)
  const apiEndpointRef = useRef('/api/chat')
  const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false)
  const [newProject, setNewProject] = useState({ name: '', description: '' })
  const [saving, setSaving] = useState(false)
  const [authChecked, setAuthChecked] = useState(false)
  const [pendingPrompt, setPendingPrompt] = useState<string | null>(null)
  const router = useRouter()
  const searchParams = useSearchParams()

  const filteredModels = modelsList.models.filter((model) => {
    if (process.env.NEXT_PUBLIC_HIDE_LOCAL_MODELS) {
      return model.providerId !== 'ollama'
    }
    return true
  })

  const defaultModel = filteredModels.find(
    (model) => model.id === (process.env.NEXT_PUBLIC_DEFAULT_MODEL_ID || 'models/gemini-3-flash-preview'),
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

  // Fire generation when project + prompt are ready (replaces setTimeout+click hack)
  useEffect(() => {
    if (!pendingPrompt || !currentProject || !session) return
    setPendingPrompt(null)
    const content: Message['content'] = [{ type: 'text', text: pendingPrompt }]
    const updatedMessages = addMessage({ role: 'user', content })
    apiEndpointRef.current = '/api/chat' // pending prompt is always a fresh generation
    submit({
      userID: session.user.id,
      teamID: userTeam?.id,
      messages: toAISDKMessages(updatedMessages),
      template: currentTemplate,
      model: currentModel,
      config: languageModel,
      currentFragment: fragment || undefined,
      backendEnabled: currentProject.backend_enabled || false,
      backendStatus: currentProject.backend_status || 'inactive',
    })
    setCurrentTab('code')
  }, [pendingPrompt, currentProject, session])

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
  const isBuildError = /\b(build\s+error|failed\s+to\s+compile|syntax\s+error|parsing\s+error)\b/i.test(userMessage)
  const isComplexChange = /\b(rebuild|recreate|rewrite|refactor|restructure)\b/i.test(userMessage)
  
  // Use Morph only for simple, targeted edits
  const isPureEdit = !isCreatingFiles && !isDeletingFiles && !isRenamingFiles && !isBuildError && !isComplexChange

  // Determine which API to use based on morph toggle and existing fragment
  const hasFragment = fragment && (
    (fragment.code && fragment.file_path) ||
    (fragment.files && fragment.files.length > 0)
  )
  const shouldUseMorph = useMorphApply && hasFragment && isPureEdit

  const { object, submit, isLoading, stop, error } = useObject({
    api: apiEndpointRef.current,
    schema,
    onError: (error) => {
      console.error('Error submitting request:', error)
      if (error.message.includes('limit')) {
        setIsRateLimited(true)
        setErrorMessage('Rate limit reached. Please wait before trying again.')
      } else if (error.message.includes('context') || error.message.includes('token')) {
        setErrorMessage('The conversation is too long. Please start a new project or simplify your request.')
      } else if (error.message.includes('network') || error.message.includes('fetch')) {
        setErrorMessage('Network error. Check your connection and try again.')
      } else {
        setErrorMessage(error.message || 'Something went wrong. Please try again.')
      }
    },
    onFinish: async ({ object: fragment, error }) => {
      if (!fragment) return

      // Always set fragment so code tab shows content even if sandbox fails
      const fragmentWithBackend = {
        ...fragment,
        backend_enabled: currentProject?.backend_enabled || false,
        backend_status: currentProject?.backend_status || 'inactive',
        backend_app_id: currentProject?.backend_app_id || undefined,
      }
      setFragment(fragmentWithBackend)

      if (error) {
        console.error('Fragment generation error:', error)
        setErrorMessage('Generation was incomplete. The code shown may be partial — try again.')
        setCurrentTab('code')
        return
      }

      setIsPreviewLoading(true)
      posthog.capture('fragment_generated', { template: fragment?.template })

      // Build final messages with assistant response and save immediately
      const codeContent = (fragment.files && fragment.files.length > 0 && fragment.files[0]
        ? fragment.files[0].file_content
        : fragment.code) || ''
      const assistantContent: Message['content'] = [
        { type: 'text', text: fragment.commentary || '' },
        { type: 'code', text: codeContent },
      ]
      setMessages(prev => {
        const last = prev[prev.length - 1]
        let finalMessages: Message[]
        if (!last || last.role !== 'assistant') {
          finalMessages = [...prev, { role: 'assistant' as const, content: assistantContent, object: fragment }]
        } else {
          finalMessages = [...prev.slice(0, -1), { ...last, content: assistantContent, object: fragment }]
        }
        console.log('[onFinish] Saving with projectId:', currentProjectRef.current?.id, 'messages:', finalMessages.length)
        saveProjectSilently(finalMessages, fragmentWithBackend, currentProjectRef.current?.id)
        return finalMessages
      })

      try {
        const response = await fetch('/api/sandbox', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fragment: fragmentWithBackend,
            userID: session?.user?.id,
            teamID: userTeam?.id,
            accessToken: session?.access_token,
            projectId: currentProjectRef.current?.id,
          }),
        })

        const result = await response.json()
        posthog.capture('sandbox_created', { url: result.url })
        setResult(result)
        setCurrentPreview({ fragment: fragmentWithBackend, result })
        setMessage({ result })
        setCurrentTab('fragment')

        // Auto-fix if actual error detected in stderr (not warnings)
        if (result.stderr && result.stderr.trim().length > 0) {
          const hasError = /error:|failed|enoent|module_not_found|syntaxerror|cannot find|unexpected token/i.test(result.stderr)
          if (hasError) {
            console.log('[Auto-fix] Error detected, submitting fix request:', result.stderr.slice(0, 200))
            
            // Auto-submit fix request to AI
            const fixMessage = `Fix this error:\n\n${result.stderr}`
            const updatedMessages = [...messages, { role: 'user' as const, content: [{ type: 'text' as const, text: fixMessage }] }]
            
            setMessages(updatedMessages)
            submit({ messages: toAISDKMessages(updatedMessages) })
          }
        }
      } catch (err) {
        console.error('Sandbox error:', err)
        setCurrentTab('code')
      } finally {
        setIsPreviewLoading(false)
      }
    },
  })

  useEffect(() => {
    if (!object || !isLoading) return
    setFragment(object)

    const codeContent = (object.files && object.files.length > 0 && object.files[0]
      ? object.files[0].file_content
      : object.code) || ''

    const content: Message['content'] = [
      { type: 'text', text: object.commentary || '' },
      { type: 'code', text: codeContent },
    ]

    setMessages((prev) => {
      const last = prev[prev.length - 1]
      if (!last || last.role !== 'assistant') {
        return [...prev, { role: 'assistant', content, object }]
      }
      const updated = [...prev]
      updated[updated.length - 1] = { ...last, content, object }
      return updated
    })
  }, [object, isLoading])

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
    
    // Force enable auto-save if user submits before load completes
    isInitialLoadRef.current = false

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

    apiEndpointRef.current = shouldUseMorph ? '/api/morph-chat' : '/api/chat'
    console.log('Using API:', apiEndpointRef.current, '| Pure edit:', isPureEdit, '| Has fragment:', hasFragment)

    submit({
      userID: session?.user?.id,
      teamID: userTeam?.id,
      messages: toAISDKMessages(updatedMessages),
      template: currentTemplate,
      model: currentModel,
      config: languageModel,
      currentFragment: fragment || undefined,
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
      currentFragment: fragment || undefined,
      backendEnabled: currentProject?.backend_enabled || false,
      backendStatus: currentProject?.backend_status || 'inactive',
    })
  }

  // Load project from URL if specified
  useEffect(() => {
    if (!authChecked || !session?.user?.id) return
    
    const projectId = searchParams.get('project')
    const templateId = searchParams.get('template')
    
    if (projectId) {
      console.log('Loading project from URL:', projectId)
      loadProject(projectId)
    } else if (templateId) {
      const template = getTemplateById(templateId)
      if (template) {
        setChatInput(template.prompt)
        if (template.platform === 'mobile') {
          setSelectedTemplate('expo-developer')
        } else if (template.platform === 'data') {
          setSelectedTemplate('streamlit-developer')
        } else {
          setSelectedTemplate('nextjs-developer')
        }
        router.replace('/chat')
        
        // Auto-submit after a brief delay to ensure state is set
        setTimeout(() => {
          if (!currentProject) {
            setPendingPrompt(template.prompt)
          } else {
            const content: Message['content'] = [{ type: 'text', text: template.prompt }]
            const updatedMessages = addMessage({ role: 'user', content })
            apiEndpointRef.current = '/api/chat'
            submit({
              userID: session.user.id,
              teamID: userTeam?.id,
              messages: toAISDKMessages(updatedMessages),
              template: currentTemplate,
              model: currentModel,
              config: languageModel,
              currentFragment: fragment || undefined,
              backendEnabled: currentProject?.backend_enabled || false,
              backendStatus: currentProject?.backend_status || 'inactive',
            })
            setCurrentTab('code')
          }
        }, 500)
      }
    }
  }, [authChecked, session?.user?.id])

  // Auto-save when fragment or messages change
  useEffect(() => {
    console.log('[auto-save effect] Triggered. projectId:', currentProject?.id, 'hasFragment:', !!fragment, 'hasSession:', !!session?.user?.id, 'isInitialLoad:', isInitialLoadRef.current, 'messagesCount:', messages.length)
    
    if (!currentProject?.id || !fragment || !session?.user?.id) return
    
    // Skip if still in initial load phase
    if (isInitialLoadRef.current) {
      console.log('[auto-save] Skipping - initial load in progress')
      return
    }
    
    console.log('[auto-save] Scheduling save in 3s...')
    const autoSaveTimer = setTimeout(() => {
      console.log('[auto-save] Timer fired, calling saveProjectSilently')
      saveProjectSilently()
    }, 3000) // Auto-save after 3 seconds of inactivity
    
    return () => {
      console.log('[auto-save] Cleanup - clearing timer')
      clearTimeout(autoSaveTimer)
    }
  }, [fragment, messages, currentProject?.id, session?.user?.id])

  async function saveProjectSilently(overrideMessages?: any[], overrideFragment?: any, overrideProjectId?: string) {
    const activeFragment = overrideFragment ?? fragment
    const activeProjectId = overrideProjectId ?? currentProject?.id
    
    console.log('[saveProjectSilently] Called with:', {
      hasFragment: !!activeFragment,
      hasSession: !!session?.user?.id,
      hasSupabase: !!supabase,
      projectId: activeProjectId,
      messagesCount: (overrideMessages ?? messages).length
    })
    
    if (!activeFragment || !session?.user?.id || !supabase || !activeProjectId) {
      console.log('[saveProjectSilently] Bailing out - missing required data')
      return
    }
    
    try {
      const { data: { session: currentSession } } = await supabase.auth.getSession()
      
      console.log('[saveProjectSilently] Saving version...')
      const versionRes = await fetch(`/api/projects/${activeProjectId}/versions`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentSession?.access_token}`
        },
        body: JSON.stringify({ fragment_data: activeFragment })
      })
      console.log('[saveProjectSilently] Version saved:', versionRes.status)

      console.log('[saveProjectSilently] Saving conversation...')
      const convRes = await fetch(`/api/projects/${activeProjectId}/conversations`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentSession?.access_token}`
        },
        body: JSON.stringify({ messages: overrideMessages ?? messages })
      })
      console.log('[saveProjectSilently] Conversation saved:', convRes.status)
      toast({ title: 'Saved', description: 'Project saved successfully.', duration: 2000 })
    } catch (error) {
      console.error('Auto-save error:', error)
      toast({ title: 'Save failed', description: 'Could not auto-save your project.', variant: 'destructive', duration: 3000 })
    }
  }

  async function loadProject(projectId: string) {
    if (!supabase) return
    
    // Disable auto-save during load
    isInitialLoadRef.current = true
    console.log('[loadProject] Disabled auto-save for load')
    
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
        toast({ title: 'Failed to load project', description: data.error, variant: 'destructive' })
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
          setPendingPrompt(data.project.user_prompt)
          return
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
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              fragment: normalizedFragment,
              userID: session?.user?.id,
              teamID: userTeam?.id,
              accessToken: session?.access_token,
              projectId: currentProjectRef.current?.id,
              githubToken: session?.provider_token ?? undefined,
            }),
          })
          
          const result = await sandboxResponse.json()
          console.log('Sandbox result:', result)
          setResult(result)
          setCurrentTab('fragment')

          // Auto-fix if actual error detected in stderr (not warnings)
          if (result.stderr && result.stderr.trim().length > 0) {
            const hasError = /error:|failed|enoent|module_not_found|syntaxerror|cannot find|unexpected token/i.test(result.stderr)
            if (hasError) {
              console.log('[Auto-fix] Error detected on load, submitting fix request:', result.stderr.slice(0, 200))
              
              // Auto-submit fix request to AI
              const fixMessage = `Fix this error:\n\n${result.stderr}`
              const updatedMessages = [...messages, { role: 'user' as const, content: [{ type: 'text' as const, text: fixMessage }] }]
              
              setMessages(updatedMessages)
              submit({ messages: toAISDKMessages(updatedMessages) })
            }
          }
        } catch (error) {
          console.error('Error running sandbox:', error)
          setCurrentTab('code')
        } finally {
          setIsPreviewLoading(false)
        }
      } else {
        console.log('No fragment data found - new project')
      }
      
      // Load messages from latest conversation if available
      if (data.conversation?.messages) {
        console.log('[loadProject] Loaded conversation:', data.conversation)
        setMessages(data.conversation.messages)
        console.log('[loadProject] Set messages count:', data.conversation.messages.length)
      } else {
        console.log('[loadProject] No conversation history found, conversation:', data.conversation)
      }
      
      // Enable auto-save now that load is complete
      console.log('[loadProject] Load complete, enabling auto-save')
      isInitialLoadRef.current = false
    } catch (error) {
      console.error('Error loading project:', error)
      toast({ title: 'Failed to load project', description: error instanceof Error ? error.message : 'Unknown error', variant: 'destructive' })
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

        toast({ title: 'Project saved', duration: 2000 })
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
          toast({ title: 'Project created', duration: 2000 })
        }
      }
    } catch (error) {
      console.error('Error saving project:', error)
      toast({ title: 'Error saving project', variant: 'destructive' })
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
            isChatLoading={isLoading}
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
            {!process.env.NEXT_PUBLIC_HIDE_MODEL_SELECTOR && (
              <ChatPicker
                models={filteredModels}
                languageModel={languageModel}
                onLanguageModelChange={handleLanguageModelChange}
              />
            )}
            {/* <ChatSettings
              languageModel={languageModel}
              onLanguageModelChange={handleLanguageModelChange}
              apiKeyConfigurable={!process.env.NEXT_PUBLIC_NO_API_KEY_INPUT}
              baseURLConfigurable={!process.env.NEXT_PUBLIC_NO_BASE_URL_INPUT}
              useMorphApply={useMorphApply}
              onUseMorphApplyChange={setUseMorphApply}
            /> */}
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
