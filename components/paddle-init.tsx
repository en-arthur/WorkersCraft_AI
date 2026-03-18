'use client'
import { useEffect } from 'react'

export default function PaddleInit() {
  useEffect(() => {
    const script = document.createElement('script')
    script.src = 'https://cdn.paddle.com/paddle/v2/paddle.js'
    script.onload = () => {
      // @ts-ignore
      if (process.env.NEXT_PUBLIC_PADDLE_ENV === 'sandbox') {
        // @ts-ignore
        window.Paddle?.Environment.set('sandbox')
      }
      // @ts-ignore
      window.Paddle?.Initialize({
        token: process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN,
      })
    }
    document.body.appendChild(script)
  }, [])
  return null
}
