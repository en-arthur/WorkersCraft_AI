export const maxDuration = 60
export const runtime = 'nodejs'

export async function POST(req: Request) {
  const { messages, codeContext, projectName } = await req.json()

  const systemPrompt = `You are a helpful assistant for a software project${projectName ? ` called "${projectName}"` : ''}.
Answer questions, explain code, suggest ideas, and help the developer think through their project.
Be concise, clear, and practical. Do not generate full files unless asked for a small illustrative snippet.
${codeContext ? `\nCurrent project code:\n\`\`\`\n${(codeContext as string).slice(0, 8000)}\n\`\`\`` : ''}`

  // Use Groq's OpenAI-compatible streaming directly to avoid ai@3.3.8 type conflicts
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      stream: true,
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages.map((m: any) => ({
          role: m.role,
          content: typeof m.content === 'string'
            ? m.content
            : m.content.filter((c: any) => c.type === 'text').map((c: any) => c.text).join(' '),
        })),
      ],
    }),
  })

  if (!response.ok) {
    const err = await response.text()
    return new Response(JSON.stringify({ error: err }), { status: response.status })
  }

  // Stream SSE from Groq → transform to plain text stream for the client
  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      const reader = response.body!.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const data = line.slice(6).trim()
          if (data === '[DONE]') { controller.close(); return }
          try {
            const json = JSON.parse(data)
            const text = json.choices?.[0]?.delta?.content
            if (text) controller.enqueue(encoder.encode(text))
          } catch {}
        }
      }
      controller.close()
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Transfer-Encoding': 'chunked',
    },
  })
}
