import Image from 'next/image'

const technologies = [
  { name: 'Python', logo: '/thirdparty/templates/python.svg' },
  { name: 'Next.js', logo: '/thirdparty/templates/nextjs.svg' },
  { name: 'Vue.js', logo: '/thirdparty/templates/vue.svg' },
  { name: 'Streamlit', logo: '/thirdparty/templates/streamlit.svg' },
  { name: 'Gradio', logo: '/thirdparty/templates/gradio.svg' },
]

const llmProviders = [
  { name: 'OpenAI', logo: '/thirdparty/logos/openai.svg' },
  { name: 'Anthropic', logo: '/thirdparty/logos/anthropic.svg' },
  { name: 'Google AI', logo: '/thirdparty/logos/google.svg' },
  { name: 'Mistral', logo: '/thirdparty/logos/mistral.svg' },
]

export function TechStack() {
  return (
    <section className="py-20 px-4 bg-muted/50">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
          Supported Technologies
        </h2>
        
        <div className="mb-16">
          <h3 className="text-xl font-semibold text-center mb-8 text-muted-foreground">
            Frameworks & Tools
          </h3>
          <div className="flex flex-wrap justify-center gap-8 items-center">
            {technologies.map((tech) => (
              <div key={tech.name} className="flex flex-col items-center gap-2">
                <div className="w-16 h-16 relative">
                  <Image
                    src={tech.logo}
                    alt={tech.name}
                    fill
                    className="object-contain"
                  />
                </div>
                <span className="text-sm text-muted-foreground">{tech.name}</span>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-xl font-semibold text-center mb-8 text-muted-foreground">
            LLM Providers
          </h3>
          <div className="flex flex-wrap justify-center gap-8 items-center">
            {llmProviders.map((provider) => (
              <div key={provider.name} className="flex flex-col items-center gap-2">
                <div className="w-16 h-16 relative">
                  <Image
                    src={provider.logo}
                    alt={provider.name}
                    fill
                    className="object-contain"
                  />
                </div>
                <span className="text-sm text-muted-foreground">{provider.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
