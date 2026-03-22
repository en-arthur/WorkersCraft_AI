import { handleAPIError, createRateLimitResponse } from '@/lib/api-errors'
import { Duration } from '@/lib/duration'
import { getModelClient, LLMModel, LLMModelConfig } from '@/lib/models'
import { applyPatch } from '@/lib/morph'
import ratelimit from '@/lib/ratelimit'
import { FragmentSchema, morphEditSchema } from '@/lib/schema'
import { generateObject, LanguageModel, CoreMessage } from 'ai'
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
      // Step 1: identify relevant files using the selected model
      let relevantPaths: Set<string>
      try {
        const { object: relevanceResult } = await generateObject({
          model: modelClient as LanguageModel,
          schema: z.object({
            relevant_files: z.array(z.string()).describe('File paths that need changes'),
          }),
          system: `You are a code editor assistant. Given a user request and a list of files, return only the file paths that need to be modified. Be conservative — only include files that directly need changes.`,
          messages: [
            {
              role: 'user',
              content: `User request: ${userRequest}\n\nFiles:\n${currentFragment.files.map(f => `- ${f.file_path}`).join('\n')}`,
            },
          ],
          maxRetries: 0,
        })
        // Fallback to all files if model returns empty
        relevantPaths = relevanceResult.relevant_files.length > 0
          ? new Set(relevanceResult.relevant_files)
          : new Set(currentFragment.files.map(f => f.file_path))
      } catch {
        // If relevance detection fails, process all files
        relevantPaths = new Set(currentFragment.files.map(f => f.file_path))
      }

      // Step 2: parallel morph edits on relevant files only
      let updatedFiles: typeof currentFragment.files
      const fileCommentaries: string[] = []
      try {
        updatedFiles = await Promise.all(
          currentFragment.files.map(async (file) => {
            if (!relevantPaths.has(file.file_path)) return file // untouched

            const result = await generateObject({
              model: modelClient as LanguageModel,
              system: `You are a code editor. Generate a JSON response with exactly these fields:
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

User request: ${userRequest}`,
              messages,
              schema: morphEditSchema,
              maxRetries: 0,
              ...modelParams,
            })

            fileCommentaries.push(result.object.commentary)

            try {
              const morphResult = await applyPatch({
                targetFile: file.file_path,
                instructions: result.object.instruction,
                initialCode: file.file_content,
                codeEdit: result.object.edit,
              })
              return { ...file, file_content: morphResult.code }
            } catch {
              // Per-file fallback: generate a full-file edit and apply via Morph
              const { object: fullEdit } = await generateObject({
                model: modelClient as LanguageModel,
                schema: morphEditSchema,
                system: `You are a code editor. The previous edit failed to apply. Generate a complete rewrite of the file as a single edit block with no // ... existing code ... markers.`,
                messages: [
                  { role: 'user', content: `File: ${file.file_path}\n\nCurrent code:\n${file.file_content}\n\nRequest: ${userRequest}` },
                ],
                maxRetries: 0,
                maxTokens: (model as any).maxOutputTokens ?? 32000,
                ...modelParams,
              })
              const fallbackResult = await applyPatch({
                targetFile: file.file_path,
                instructions: fullEdit.instruction,
                initialCode: file.file_content,
                codeEdit: fullEdit.edit,
              })
              return { ...file, file_content: fallbackResult.code }
            }
          })
        )
      } catch (err) {
        return handleAPIError(err)
      }

      updatedFragment = {
        ...currentFragment,
        files: updatedFiles,
        commentary: fileCommentaries.join(' '),
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
