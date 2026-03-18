'use client'
import { useEffect } from 'react'

export default function PaddleInit() {
  useEffect(() => {
    const script = document.createElement('script')
    script.src = 'https://cdn.paddle.com/paddle/v2/paddle.js'
    script.onload = () => {
      // @ts-ignore
      window.Paddle?.Setup({
        token: process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN,
        environment: process.env.NEXT_PUBLIC_PADDLE_ENV || 'sandbox',
      })
    }
    document.body.appendChild(script)
  }, [])
  return null
}
