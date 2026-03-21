'use client'
import React from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowRight, Sparkles } from 'lucide-react'
import dynamic from 'next/dynamic'

const DotGrid = dynamic(() => import('./DotGrid'), { ssr: false })
const RotatingText = dynamic(() => import('./RotatingText'), { ssr: false }) as React.ComponentType<any>

export function Hero() {
  return (
    <section className="relative flex flex-col items-center justify-center min-h-[85vh] px-4 text-center">
      {/* DotGrid background */}
      <div className="absolute inset-0 -z-10">
        <DotGrid
          dotSize={16}
          gap={25}
          baseColor="#271E37"
          activeColor="#5227FF"
          proximity={110}
          speedTrigger={100}
          shockRadius={250}
          shockStrength={5}
          maxSpeed={5000}
          resistance={750}
          returnDuration={1.5}
        />
      </div>
      
      <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-muted/50 text-sm mb-8 border">
        <Sparkles className="w-4 h-4 text-primary" />
        <span>AI-Powered Application Builder</span>
      </div>
      
      <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold mb-6 tracking-tight">
        <span className="block">The fastest way to build</span>
        <RotatingText
          texts={['Mobile apps', 'Web apps', 'Backend APIs', 'Internal tools', 'Full-stack apps']}
          rotationInterval={2500}
          staggerDuration={0}
          staggerFrom="first"
          mainClassName=""
          elementLevelClassName="inline-block bg-gradient-to-r from-blue-600 via-purple-600 to-blue-600 bg-clip-text text-transparent"
        />
      </h1>
      
      <p className="text-xl md:text-2xl text-muted-foreground mb-10 max-w-3xl leading-relaxed">
        Transform your ideas into interactive applications using natural language. 
        WorkersCraft AI creates production-ready apps in seconds.
      </p>
      
      <div className="flex gap-4 flex-wrap justify-center">
        <Link href="/auth">
          <Button size="lg" className="gap-2 px-8 h-12 text-lg">
            Get Started <ArrowRight className="w-5 h-5" />
          </Button>
        </Link>
      </div>
    </section>
  )
}
