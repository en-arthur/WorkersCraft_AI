'use client'

import { useState } from 'react'

export function DiscountBanner({ variant = 'default' }: { variant?: 'default' | 'top' }) {
  const [revealed, setRevealed] = useState(false)

  if (variant === 'top') {
    return (
      <div className="bg-primary text-primary-foreground text-center py-3 px-4 text-sm font-medium">
        🎉 Early User Special: 40% off all plans —{' '}
        {revealed ? (
          <span className="font-bold bg-white/20 px-2 py-0.5 rounded mx-1 select-all">EARLYUSER40</span>
        ) : (
          <button onClick={() => setRevealed(true)} className="font-bold underline cursor-pointer mx-1">
            Click to reveal code
          </button>
        )}
        — Limited time offer
      </div>
    )
  }

  return (
    <div className="mb-6 p-4 rounded-xl bg-primary/10 border border-primary/20 text-center">
      <p className="text-sm font-medium">
        🎉 Early User Special: 40% off at checkout —{' '}
        {revealed ? (
          <span className="font-bold bg-primary/20 px-2 py-0.5 rounded mx-1 select-all">EARLYUSER40</span>
        ) : (
          <button onClick={() => setRevealed(true)} className="font-bold underline cursor-pointer text-primary mx-1">
            Click to reveal code
          </button>
        )}
        — Limited time
      </p>
    </div>
  )
}
