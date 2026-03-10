import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Code, Zap, Shield, Layers } from 'lucide-react'

const features = [
  {
    icon: Code,
    title: 'Multiple Frameworks',
    description: 'Support for Next.js, Vue.js, Streamlit, Gradio, and Python interpreter',
  },
  {
    icon: Zap,
    title: 'Real-time Streaming',
    description: 'Watch your app being built in real-time with streaming UI updates',
  },
  {
    icon: Shield,
    title: 'Secure Execution',
    description: 'Code runs in isolated E2B sandboxes for maximum security',
  },
  {
    icon: Layers,
    title: 'Any Package',
    description: 'Install and use any npm or pip package on the fly',
  },
]

export function Features() {
  return (
    <section className="py-20 px-4">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
          Powerful Features
        </h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature) => (
            <Card key={feature.title}>
              <CardHeader>
                <feature.icon className="w-10 h-10 mb-2 text-primary" />
                <CardTitle>{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>{feature.description}</CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}
