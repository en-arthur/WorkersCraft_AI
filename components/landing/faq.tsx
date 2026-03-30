'use client'

import { useState } from 'react'
import { Plus, Minus } from 'lucide-react'
import { Reveal } from './reveal'

const faqs = [
  {
    q: 'What is an AI app builder?',
    a: 'An AI app builder lets you create fully functional applications by describing what you want in plain English. WorkersCraft AI generates the code, sets up the backend, and deploys your app — no coding required.'
  },
  {
    q: 'How is WorkersCraft different from Replit, Lovable, or Bolt.new?',
    a: 'Most AI builders only generate frontend code. WorkersCraft automatically provisions a full backend with user authentication, database, and file storage for every app you build — no external services needed.'
  },
  {
    q: 'Can I build a mobile app without coding?',
    a: 'Yes. WorkersCraft supports React Native (Expo) mobile app generation. Just describe your app and get a production-ready mobile app with live preview instantly.'
  },
  {
    q: 'Does WorkersCraft include backend services?',
    a: 'Yes — every app gets a dedicated backend automatically. This includes user authentication, database storage, file uploads, and a REST API. Zero configuration required.'
  },
  {
    q: 'Can I export and own my code?',
    a: 'Absolutely. You own 100% of the generated code. You can connect your GitHub repository and push your code at any time.'
  },
  {
    q: 'Is there a free trial?',
    a: 'Plans start at $30/month with a 40% launch discount available. Each plan includes a set number of projects per month so you can build and ship real apps right away.'
  },
  {
    q: 'What kind of apps can I build?',
    a: 'You can build web apps, mobile apps, dashboards, SaaS tools, landing pages, internal tools, and more — all with a full backend included.'
  },
  {
    q: 'Is my data secure?',
    a: 'Yes. Every app runs in an isolated sandbox environment. Your data and code are never shared between users.'
  },
]

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="border-b last:border-b-0">
      <button
        className="w-full flex items-center justify-between py-5 text-left gap-4"
        onClick={() => setOpen(!open)}
      >
        <span className="font-medium text-base">{q}</span>
        {open ? <Minus className="w-4 h-4 shrink-0 text-muted-foreground" /> : <Plus className="w-4 h-4 shrink-0 text-muted-foreground" />}
      </button>
      {open && (
        <p className="text-muted-foreground text-sm leading-relaxed pb-5">{a}</p>
      )}
    </div>
  )
}

export function FAQ() {
  return (
    <section className="py-24 px-4">
      <div className="max-w-3xl mx-auto">
        <Reveal>
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-5xl font-bold mb-4">Frequently Asked Questions</h2>
            <p className="text-muted-foreground text-lg">Everything you need to know about WorkersCraft AI.</p>
          </div>
        </Reveal>
        <Reveal delay={80}>
          <div className="rounded-2xl border divide-y">
            {faqs.map(({ q, a }) => (
              <div key={q} className="px-6">
                <FAQItem q={q} a={a} />
              </div>
            ))}
          </div>
        </Reveal>
      </div>

      {/* FAQ Structured Data for Google */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'FAQPage',
            mainEntity: faqs.map(({ q, a }) => ({
              '@type': 'Question',
              name: q,
              acceptedAnswer: { '@type': 'Answer', text: a }
            }))
          })
        }}
      />
    </section>
  )
}
