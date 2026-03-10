import { Card, CardContent } from '@/components/ui/card'
import Image from 'next/image'

export function Demo() {
  return (
    <section className="py-24 px-4 bg-muted/30">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-bold mb-4">
            See It In Action
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Watch how easily you can build complex applications with just a description.
          </p>
        </div>
        
        <Card className="overflow-hidden border-0 shadow-2xl">
          <CardContent className="p-0">
            <div className="relative aspect-video bg-gradient-to-br from-slate-900 to-slate-800">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center text-white p-8">
                  <div className="w-20 h-20 rounded-full bg-white/10 flex items-center justify-center mx-auto mb-6">
                    <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <p className="text-lg text-white/80 mb-4">Interactive Demo Preview</p>
                  <p className="text-sm text-white/60">Try it yourself at /chat</p>
                </div>
              </div>
              
              {/* Browser chrome */}
              <div className="absolute top-4 left-4 right-4 h-8 bg-white/10 rounded-lg flex items-center px-3 gap-2">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-500/80" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                  <div className="w-3 h-3 rounded-full bg-green-500/80" />
                </div>
                <div className="flex-1 mx-4 h-5 bg-white/5 rounded-md" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  )
}
