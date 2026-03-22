import { handleAPIError, createRateLimitResponse } from '@/lib/api-errors'
import { Duration } from '@/lib/duration'
import { getModelClient, LLMModel, LLMModelConfig } from '@/lib/models'
import { toPrompt } from '@/lib/prompt'
import ratelimit from '@/lib/ratelimit'
import { fragmentSchema as schema } from '@/lib/schema'
import { Templates } from '@/lib/templates'
import { streamObject, streamText, generateObject, LanguageModel, CoreMessage } from 'ai'
import { ingestEvent } from '@/lib/usage'
import { z } from 'zod'

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
    skipClassification,
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
    skipClassification?: boolean
  } = await req.json()

  const limit = !config.apiKey
    ? await ratelimit(req.headers.get('x-forwarded-for'), rateLimitMaxRequests, ratelimitWindow)
    : false

  if (limit) return createRateLimitResponse(limit)

  console.log('userID', userID)
  console.log('teamID', teamID)
  console.log('model', model)

  const { model: modelNameString, apiKey: modelApiKey, ...modelParams } = config
  const modelClient = getModelClient(model, config)

  // Build existing code context
  let existingCodeContext = ''
  if (currentFragment) {
    if (currentFragment.files && currentFragment.files.length > 0) {
      existingCodeContext = `

EXISTING CODE (read this before making changes):

${currentFragment.files.map(f => `=== File: ${f.file_path} ===\n${f.file_content}\n`).join('\n')}

IMPORTANT:
- Your response MUST include ALL existing files in the files array, unchanged
- Add the new file(s) to the files array alongside ALL existing files
- NEVER drop or omit any existing file from the output
- Only modify the specific file(s) the user asked to change
`
    } else if (currentFragment.code && currentFragment.file_path) {
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

    // Classify intent — skip on re-submit (already classified)
    if (!skipClassification) {
      const lastUserMessage = [...messages].reverse().find(m => m.role === 'user')
      const lastText = typeof lastUserMessage?.content === 'string'
        ? lastUserMessage.content
        : Array.isArray(lastUserMessage?.content)
        ? lastUserMessage.content.map((c: any) => c.type === 'text' ? c.text : '').join(' ')
        : ''

      // Fast regex check first — no LLM call needed for obvious cases
      const isClearlyChat = lastText.trim().length < 80 &&
        /^(hi|hello|hey|thanks|thank you|ok|okay|cool|great|yes|no|sure|how are|what can you|who are you|what is this|what do you do|nice|awesome|perfect|got it|sounds good|makes sense)/i.test(lastText.trim())

      const isClearlyBuild = /\b(build|create|make|add|fix|update|change|edit|remove|delete|refactor|style|implement|generate|write|show|display|render)\b/i.test(lastText)

      let intentType: 'chat' | 'build' = 'build'

      if (isClearlyChat && !isClearlyBuild) {
        intentType = 'chat'
      } else if (!isClearlyBuild) {
        // Only call LLM for ambiguous cases
        const { object: intent } = await generateObject({
          model: modelClient as LanguageModel,
          schema: z.object({ type: z.enum(['chat', 'build']) }),
          system: `Classify the user message as "chat" (greeting/question/feedback, NOT a code request) or "build" (any request to create/edit/modify an app or code). Reply with only the JSON.`,
          messages: [{ role: 'user', content: lastText }],
          maxRetries: 0,
        })
        intentType = intent.type
      }

      if (intentType === 'chat') {
        const chatStream = await streamText({
          model: modelClient as LanguageModel,
          system: `You are WorkersCraft AI, a friendly AI app builder assistant.
The user is chatting — they have NOT asked you to build anything.
Respond conversationally in 1-3 sentences. Do NOT generate code or mention files.`,
          messages,
          maxTokens: 300,
        })
        const response = chatStream.toTextStreamResponse()
        return new Response(response.body, {
          headers: { ...Object.fromEntries(response.headers.entries()), 'X-Response-Type': 'chat' },
        })
      }
    }

    const stream = await streamObject({
      model: modelClient as LanguageModel,
      schema,
      system: toPrompt(template) + existingCodeContext + backendPrompt,
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
