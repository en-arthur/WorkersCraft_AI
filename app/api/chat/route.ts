import { handleAPIError, createRateLimitResponse } from '@/lib/api-errors'
import { Duration } from '@/lib/duration'
import { getModelClient, LLMModel, LLMModelConfig } from '@/lib/models'
import { toPrompt } from '@/lib/prompt'
import ratelimit from '@/lib/ratelimit'
import { fragmentSchema as schema } from '@/lib/schema'
import { Templates } from '@/lib/templates'
import { streamObject, LanguageModel, CoreMessage } from 'ai'

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
- You are EDITING existing code, not creating from scratch
- Preserve all existing files unless specifically asked to remove them
- Only modify what the user requested
- Keep all other code unchanged
`
    } 
    // Handle single-file format
    else if (currentFragment.code && currentFragment.file_path) {
      existingCodeContext = `

EXISTING CODE (read this before making changes):

=== File: ${currentFragment.file_path} ===
${currentFragment.code}

IMPORTANT: 
- You are EDITING existing code, not creating from scratch
- Only modify what the user requested
- Keep all other code unchanged
`
    }
  }

  try {
    const stream = await streamObject({
      model: modelClient as LanguageModel,
      schema,
      system: toPrompt(template) + existingCodeContext,
      messages,
      maxRetries: 0, // do not retry on errors
      ...modelParams,
    })

    return stream.toTextStreamResponse()
  } catch (error: any) {
    return handleAPIError(error, { hasOwnApiKey: !!config.apiKey })
  }
}
