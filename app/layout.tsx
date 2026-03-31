import './globals.css'
import { PostHogProvider, ThemeProvider } from './providers'
import { Toaster } from '@/components/ui/toaster'
import { Analytics } from '@vercel/analytics/next'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'WorkersCraft AI — AI App Builder with Backend | Build Full-Stack Apps',
  description: 'The only AI app builder that includes backend, auth, and database automatically. Build web and mobile apps in minutes without coding. No external services needed.',
  metadataBase: new URL('https://www.workerscraft.com'),
  alternates: {
    canonical: '/',
  },
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
    ],
    apple: '/apple-touch-icon.png',
  },
  manifest: '/site.webmanifest',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <style>{`@import url('https://fonts.googleapis.com/css2?family=Google+Sans:ital,opsz,wght@0,17..18,400..700;1,17..18,400..700&display=swap');`}</style>
        <script src="https://cdn.paddle.com/paddle/v2/paddle.js" async></script>
        <script async src="https://assets.endorsely.com/endorsely.js" data-endorsely="2e4c7866-d841-48a8-8128-32eb3ae6090d"></script>
      </head>
      <PostHogProvider>
        <body>
          <ThemeProvider
            attribute="class"
            defaultTheme="dark"
            forcedTheme="dark"
            enableSystem
            disableTransitionOnChange
          >
            {children}
          </ThemeProvider>
          <Toaster />
          <Analytics />
        </body>
      </PostHogProvider>
    </html>
  )
}
