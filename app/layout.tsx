import './globals.css'
import { PostHogProvider, ThemeProvider } from './providers'
import { Toaster } from '@/components/ui/toaster'
import { Analytics } from '@vercel/analytics/next'
import Script from 'next/script'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'WorkersCraft AI - Build Apps with AI',
  description: 'AI-powered application builder that creates production-ready apps in seconds',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <PostHogProvider>
        <body className={inter.className}>
          <ThemeProvider
            attribute="class"
            defaultTheme="dark"
            enableSystem
            disableTransitionOnChange
          >
            {children}
          </ThemeProvider>
          <Toaster />
          <Analytics />
          <Script
            src="https://cdn.paddle.com/paddle/v2/paddle.js"
            onLoad={() => {
              // @ts-ignore
              window.Paddle?.Setup({
                token: process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN,
                environment: process.env.NEXT_PUBLIC_PADDLE_ENV || 'sandbox',
              })
            }}
          />
        </body>
      </PostHogProvider>
    </html>
  )
}
