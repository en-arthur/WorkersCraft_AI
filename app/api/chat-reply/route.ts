import { getModelClient, LLMModel, LLMModelConfig } from '@/lib/models'
import { streamText, generateObject, LanguageModel, CoreMessage } from 'ai'
import { z } from 'zod'

export const maxDuration = 60

export async function POST(req: Request) {
  const {
    messages,
    model,
    config,
  }: {
    messages: CoreMessage[]
    model: LLMModel
    config: LLMModelConfig
  } = await req.json()

  const { model: _m, apiKey: _k, ...modelParams } = config
  const modelClient = getModelClient(model, config)

  const stream = await streamText({
    model: modelClient as LanguageModel,
    system: `You are WorkersCraft AI, a friendly AI app builder assistant. 
The user is chatting with you — they have NOT asked you to build or modify anything.
Respond conversationally in 1-3 sentences. Be helpful and friendly.
Do NOT generate code or mention files.`,
    messages,
    maxTokens: 300,
    ...modelParams,
  })

  return stream.toTextStreamResponse()
}
