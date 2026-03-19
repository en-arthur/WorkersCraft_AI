'use client'
import { useEffect } from 'react'
import Script from 'next/script'

// This page is the Paddle default payment link target.
// Paddle appends ?_ptxn=txn_... and Paddle.js auto-opens the overlay checkout.
// Overlay mode avoids WASM/SIGILL on Chromebook (unlike inline mode).
export default function PayPage() {
  useEffect(() => {
    // Paddle.js auto-detects _ptxn on load — nothing extra needed.
    // successCallback redirects back to billing on completion.
    if (typeof window === 'undefined') return
    const onPaddleLoad = () => {
      const env = process.env.NEXT_PUBLIC_PADDLE_ENV
      if (env === 'sandbox') {
        window.Paddle?.Environment?.set('sandbox')
      }
      window.Paddle?.Initialize({
        token: process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN,
        checkout: {
          settings: {
            displayMode: 'overlay',
            successUrl: `${window.location.origin}/billing?success=true`,
          },
        },
      })
    }
    if (window.Paddle) {
      onPaddleLoad()
    } else {
      window.__paddleOnLoad = onPaddleLoad
    }
  }, [])

  return (
    <>
      <Script
        src="https://cdn.paddle.com/paddle/v2/paddle.js"
        onLoad={() => window.__paddleOnLoad?.()}
      />
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">Loading checkout…</p>
      </div>
    </>
  )
}
