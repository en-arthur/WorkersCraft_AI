import { handleAPIError, createRateLimitResponse } from '@/lib/api-errors'
import { Duration } from '@/lib/duration'
import { getModelClient, LLMModel, LLMModelConfig } from '@/lib/models'
import { applyPatch } from '@/lib/morph'
import ratelimit from '@/lib/ratelimit'
import { FragmentSchema, morphEditSchema } from '@/lib/schema'
import { generateObject, LanguageModel, CoreMessage } from 'ai'

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
    model,
    config,
    currentFragment,
  }: {
    messages: CoreMessage[]
    model: LLMModel
    config: LLMModelConfig
    currentFragment: FragmentSchema
  } = await req.json()

  // Rate limiting
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

  const { model: modelNameString, apiKey: modelApiKey, ...modelParams } = config
  const modelClient = getModelClient(model, config)

  // Get the main file path and code
  const mainFilePath = currentFragment.files && currentFragment.files.length > 0
    ? currentFragment.files[0].file_path
    : currentFragment.file_path || 'app.py'
  
  const mainCode = currentFragment.files && currentFragment.files.length > 0
    ? currentFragment.files[0].file_content
    : currentFragment.code || ''

  try {
    const contextualSystemPrompt = `You are a code editor. Generate a JSON response with exactly these fields:

{
  "commentary": "Explain what changes you are making",
  "instruction": "One line description of the change", 
  "edit": "The code changes with // ... existing code ... for unchanged parts",
  "file_path": "${mainFilePath}"
}

Current file: ${mainFilePath}
Current code:
\`\`\`
${mainCode}
\`\`\`

`

    const result = await generateObject({
      model: modelClient as LanguageModel,
      system: contextualSystemPrompt,
      messages,
      schema: morphEditSchema,
      maxRetries: 0,
      ...modelParams,
    })

    const editInstructions = result.object

    // Apply edits using Morph
    const morphResult = await applyPatch({
      targetFile: mainFilePath,
      instructions: editInstructions.instruction,
      initialCode: mainCode,
      codeEdit: editInstructions.edit,
    })

    // Build updated fragment based on format
    let updatedFragment: FragmentSchema
    
    if (currentFragment.files && currentFragment.files.length > 0) {
      // Multi-file format: update the first file
      updatedFragment = {
        ...currentFragment,
        files: [
          {
            ...currentFragment.files[0],
            file_content: morphResult.code,
          },
          ...currentFragment.files.slice(1),
        ],
        commentary: editInstructions.commentary,
      }
    } else {
      // Single-file format
      updatedFragment = {
        ...currentFragment,
        code: morphResult.code,
        commentary: editInstructions.commentary,
      }
    }

    // Return in AI SDK streaming format
    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      start(controller) {
        // AI SDK expects newline-delimited JSON chunks
        const chunk = `0:${JSON.stringify(updatedFragment)}\n`
        controller.enqueue(encoder.encode(chunk))
        controller.close()
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'X-Vercel-AI-Data-Stream': 'v1',
      },
    })
  } catch (error) {
    return handleAPIError(error)
  }
}
