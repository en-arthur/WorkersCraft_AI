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

  // Get user's edit request from last message
  const lastMessage = messages[messages.length - 1]
  const userRequest = typeof lastMessage.content === 'string' 
    ? lastMessage.content 
    : lastMessage.content.map(c => c.type === 'text' ? c.text : '').join(' ')

  try {
    let updatedFragment: FragmentSchema

    // Handle multi-file format
    if (currentFragment.files && currentFragment.files.length > 0) {
      const updatedFiles = []

      // Loop through each file and apply Morph edits
      for (const file of currentFragment.files) {
        const contextualSystemPrompt = `You are a code editor. Generate a JSON response with exactly these fields:

{
  "commentary": "Explain what changes you are making to ${file.file_path}",
  "instruction": "One line description of the change", 
  "edit": "The code changes with // ... existing code ... for unchanged parts",
  "file_path": "${file.file_path}"
}

Current file: ${file.file_path}
Current code:
\`\`\`
${file.file_content}
\`\`\`

User request: ${userRequest}
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
          targetFile: file.file_path,
          instructions: editInstructions.instruction,
          initialCode: file.file_content,
          codeEdit: editInstructions.edit,
        })

        updatedFiles.push({
          ...file,
          file_content: morphResult.code,
        })
      }

      updatedFragment = {
        ...currentFragment,
        files: updatedFiles,
        commentary: `Updated ${updatedFiles.length} file(s)`,
      }
    } 
    // Handle single-file format
    else {
      const mainFilePath = currentFragment.file_path || 'app.py'
      const mainCode = currentFragment.code || ''

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

      updatedFragment = {
        ...currentFragment,
        code: morphResult.code,
        commentary: editInstructions.commentary,
      }
    }

    // Return in original streaming format (no prefix)
    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      start(controller) {
        const json = JSON.stringify(updatedFragment)
        controller.enqueue(encoder.encode(json))
        controller.close()
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
      },
    })
  } catch (error) {
    return handleAPIError(error)
  }
}
