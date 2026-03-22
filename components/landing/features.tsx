import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Code2, Zap, Shield, Box, Wand2, Globe } from 'lucide-react'

const features = [
  {
    icon: Wand2,
    title: 'Natural Language',
    description: 'Describe what you want to build in plain English and watch WorkersCraft AI create it instantly.',
  },
  {
    icon: Code2,
    title: 'Multiple Frameworks',
    description: 'Support for Next.js, Streamlit, and Expo (React Native) for web and mobile applications.',
  },
  {
    icon: Zap,
    title: 'Real-time Preview',
    description: 'See your application being built in real-time with live streaming updates.',
  },
  {
    icon: Box,
    title: 'Any Package',
    description: 'Install and use any npm or Python package on the fly without any setup.',
  },
  {
    icon: Shield,
    title: 'Secure Execution',
    description: 'Code runs in isolated secure sandboxes ensuring safety and reliability.',
  },
  {
    icon: Globe,
    title: 'Instant Deploy',
    description: 'Deploy your applications instantly with shareable links for easy collaboration.',
  },
]

export function Features() {
  return (
    <section className="py-24 px-4 relative">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-bold mb-4">
            Everything You Need
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Powerful features to turn your ideas into reality without writing a single line of code.
          </p>
        </div>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <Card key={feature.title} className="group hover:shadow-lg transition-all duration-300 border-muted">
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                  <feature.icon className="w-6 h-6 text-primary" />
                </div>
                <CardTitle className="text-xl">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base">{feature.description}</CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}
