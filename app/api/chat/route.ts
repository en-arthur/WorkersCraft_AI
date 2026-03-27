import { handleAPIError, createRateLimitResponse } from '@/lib/api-errors'
import { Duration } from '@/lib/duration'
import { getModelClient, LLMModel, LLMModelConfig } from '@/lib/models'
import { toPrompt } from '@/lib/prompt'
import ratelimit from '@/lib/ratelimit'
import { fragmentSchema as schema } from '@/lib/schema'
import { Templates } from '@/lib/templates'
import { streamObject, LanguageModel, CoreMessage } from 'ai'
import { ingestEvent } from '@/lib/usage'

export const maxDuration = 300

const rateLimitMaxRequests = process.env.RATE_LIMIT_MAX_REQUESTS
  ? parseInt(process.env.RATE_LIMIT_MAX_REQUESTS)
  : 10
const ratelimitWindow = process.env.RATE_LIMIT_WINDOW
  ? (process.env.RATE_LIMIT_WINDOW as Duration)
  : '1d'

export async function POST(req: Request) {
  const {
    messages,
    userID,
    teamID,
    template,
    model,
    config,
    currentFragment,
    backendEnabled,
    backendStatus,
  }: {
    messages: CoreMessage[]
    userID: string | undefined
    teamID: string | undefined
    template: Templates
    model: LLMModel
    config: LLMModelConfig
    currentFragment?: {
      files?: Array<{ file_path: string; file_name: string; file_content: string }>
      code?: string
      file_path?: string
    }
    backendEnabled?: boolean
    backendStatus?: string
  } = await req.json()

  const limit = !config.apiKey
    ? await ratelimit(
        req.headers.get('x-forwarded-for'),
        rateLimitMaxRequests,
        ratelimitWindow,
      )
    : false

  if (limit) {
    return createRateLimitResponse(limit)
  }

  console.log('userID', userID)
  console.log('teamID', teamID)
  console.log('model', model)

  const { model: modelNameString, apiKey: modelApiKey, ...modelParams } = config
  const modelClient = getModelClient(model, config)

  // Build existing code context
  let existingCodeContext = ''
  
  if (currentFragment) {
    // Handle multi-file format
    if (currentFragment.files && currentFragment.files.length > 0) {
      existingCodeContext = `

EXISTING CODE (read this before making changes):

${currentFragment.files.map(f => 
  `=== File: ${f.file_path} ===
${f.file_content}
`).join('\n')}

IMPORTANT: 
- You are working with an existing project
- For SIMPLE EDITS (styling, text changes, small fixes): Only modify the specific file(s) mentioned
- For BUILD ERRORS or COMPLEX CHANGES: You may need to regenerate affected components
- Your response MUST include ALL existing files in the files array
- Add new file(s) to the files array alongside ALL existing files
- NEVER drop or omit any existing file from the output
- If user says "fix build error" or "syntax error", identify the specific file and fix ONLY that error
- If user says "change color" or "update text", modify ONLY the mentioned elements
`
    } 
    // Handle single-file format
    else if (currentFragment.code && currentFragment.file_path) {
      existingCodeContext = `

EXISTING CODE (read this before making changes):

=== File: ${currentFragment.file_path} ===
${currentFragment.code}

IMPORTANT: 
- You are working with an existing project
- If adding new files, use the files array format
- If editing the existing file, only modify what the user requested
- Keep all other code unchanged
`
    }
  }

  try {
    const { getBackendPrompt } = await import('@/lib/prompt')
    const backendPrompt = getBackendPrompt(backendEnabled || false, backendStatus || 'inactive')

    // Detect conversational messages — don't force schema generation for greetings/questions
    const lastUserMessage = [...messages].reverse().find(m => m.role === 'user')
    const lastText = typeof lastUserMessage?.content === 'string'
      ? lastUserMessage.content
      : Array.isArray(lastUserMessage?.content)
      ? lastUserMessage.content.map((c: any) => c.type === 'text' ? c.text : '').join(' ')
      : ''
    const isConversational = lastText.trim().length < 60 &&
      /^(hi|hello|hey|thanks|thank you|ok|okay|cool|great|yes|no|sure|what|who|why|how are|what can|what do)\b/i.test(lastText.trim())

    const conversationalInstruction = isConversational
      ? `\n\nThe user sent a conversational message, not a build request. Respond ONLY in the commentary field with a friendly, helpful reply (1-5 sentences). Do NOT generate, modify, or return any code or files. Leave all code fields empty.`
      : ''

    const stream = await streamObject({
      model: modelClient as LanguageModel,
      schema,
      system: toPrompt(template) + (isConversational ? '' : existingCodeContext) + backendPrompt + conversationalInstruction,
      messages,
      maxTokens: (model as any).maxOutputTokens ?? 32000,
      maxRetries: 2,
      ...modelParams,
    })

    if (userID) ingestEvent(userID, 'ai_generation', { model: model.id })

    const response = stream.toTextStreamResponse()
    return new Response(response.body, {
      headers: {
        ...Object.fromEntries(response.headers.entries()),
        'X-Stream-Error': 'false',
      },
    })
  } catch (error: any) {
    return handleAPIError(error, { hasOwnApiKey: !!config.apiKey })
  }
}
