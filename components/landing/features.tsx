import Image from 'next/image'
import { CheckCircle } from 'lucide-react'
import { Reveal } from './reveal'

const features = [
  {
    title: 'Build with Natural Language',
    description: 'Describe what you want to build in plain English and watch WorkersCraft AI create it instantly.',
    image: '/workerscraft-images/natural-language.png',
    bullets: ['AI-powered generation', 'Instant prototyping', 'Iterative refinement']
  },
  {
    title: 'Multiple Frameworks Supported',
    description: 'Support for Next.js and Expo (React Native) for web and mobile applications.',
    image: '/workerscraft-images/multiple-frameworks.png',
    bullets: ['React & Next.js', 'Expo & React Native', 'Full TypeScript support']
  },
  {
    title: 'Real-time Preview',
    description: 'See your application being built in real-time with live streaming updates.',
    image: '/workerscraft-images/realtime-preview.png',
    bullets: ['Live hot reload', 'Mobile device preview', 'Instant feedback loop']
  },
  {
    title: 'Any NPM Package',
    description: 'Install and use any npm or Python package on the fly without any setup.',
    image: '/workerscraft-images/any-package.png',
    bullets: ['Full NPM ecosystem', 'Auto-install dependencies', 'Version management']
  },
  {
    title: 'Secure Sandbox Environment',
    description: 'Code runs in isolated secure sandboxes ensuring safety and reliability.',
    image: '/workerscraft-images/secure-sandbox.png',
    bullets: ['Isolated execution', 'Resource limits', 'DDoS protection']
  },
  {
    title: 'One-Click Deployment',
    description: 'Deploy your applications instantly with shareable links for easy collaboration.',
    image: '/workerscraft-images/deploy.png',
    bullets: ['Global CDN', 'Automatic SSL', 'Zero-downtime deploys']
  },
]

export function Features() {
  return (
    <section className="py-24 px-4 relative">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-20">
          <h2 className="text-3xl md:text-5xl font-bold mb-4">
            Everything You Need
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Powerful features to turn your ideas into reality without writing a single line of code.
          </p>
        </div>
        
        <div className="space-y-32">
          {features.map((feature, i) => {
            const isEven = i % 2 === 0
            return (
              <div key={feature.title} className="relative">
                <div className={`absolute inset-0 -z-10 bg-[radial-gradient(ellipse_60%_50%_at_${isEven ? '20%' : '80%'}_50%,rgba(${isEven ? '59,130,246' : '139,92,246'},0.08),transparent)]`} />
                <div className={`grid grid-cols-1 lg:grid-cols-2 gap-12 items-center ${isEven ? '' : 'lg:grid-flow-dense'}`}>
                  <Reveal delay={100}>
                    <div className={isEven ? '' : 'lg:col-start-2'}>
                      <Image
                        src={feature.image}
                        alt={feature.title}
                        width={1920}
                        height={1080}
                        className="rounded-2xl shadow-2xl border border-white/10 hover:scale-[1.02] transition-transform duration-300"
                      />
                    </div>
                  </Reveal>
                  <Reveal delay={200}>
                    <div className={`space-y-6 ${isEven ? '' : 'lg:col-start-1 lg:row-start-1'}`}>
                      <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-blue-600/20 to-purple-600/20 border border-white/10">
                        <span className="text-2xl font-bold text-primary">{String(i + 1).padStart(2, '0')}</span>
                      </div>
                      <h3 className="text-3xl md:text-4xl font-bold">{feature.title}</h3>
                      <p className="text-lg text-muted-foreground leading-relaxed">{feature.description}</p>
                      <ul className="space-y-3">
                        {feature.bullets.map((bullet, j) => (
                          <li key={j} className="flex items-center gap-3">
                            <CheckCircle className="w-5 h-5 text-primary shrink-0" />
                            <span className="text-muted-foreground">{bullet}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </Reveal>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
