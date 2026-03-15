'use client'

import { useEffect, useRef } from 'react'
import { gsap } from 'gsap'

export default function DotGrid({
  dotSize = 16,
  gap = 32,
  baseColor = '#5227FF',
  activeColor = '#5227FF',
  proximity = 150,
  speedTrigger = 100,
  shockRadius = 250,
  shockStrength = 5,
  maxSpeed = 5000,
  resistance = 750,
  returnDuration = 1.5,
  className = '',
  style = {},
}) {
  const canvasRef = useRef(null)
  const mouse = useRef({ x: -9999, y: -9999, vx: 0, vy: 0, px: -9999, py: -9999 })
  const dotsRef = useRef([])
  const rafRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')

    const buildGrid = () => {
      const W = canvas.offsetWidth
      const H = canvas.offsetHeight
      canvas.width = W
      canvas.height = H

      dotsRef.current = []
      const cols = Math.floor((W + gap) / (dotSize + gap))
      const rows = Math.floor((H + gap) / (dotSize + gap))
      const padX = (W - cols * (dotSize + gap) + gap) / 2
      const padY = (H - rows * (dotSize + gap) + gap) / 2

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          dotsRef.current.push({
            ox: padX + c * (dotSize + gap) + dotSize / 2,
            oy: padY + r * (dotSize + gap) + dotSize / 2,
            x: 0, y: 0,       // offset from origin
            vx: 0, vy: 0,     // velocity
            color: baseColor,
            scale: 1,
          })
        }
      }
    }

    const hexToRgb = (hex) => {
      const r = parseInt(hex.slice(1, 3), 16)
      const g = parseInt(hex.slice(3, 5), 16)
      const b = parseInt(hex.slice(5, 7), 16)
      return { r, g, b }
    }

    const lerpColor = (a, b, t) => {
      const ca = hexToRgb(a), cb = hexToRgb(b)
      return `rgb(${Math.round(ca.r + (cb.r - ca.r) * t)},${Math.round(ca.g + (cb.g - ca.g) * t)},${Math.round(ca.b + (cb.b - ca.b) * t)})`
    }

    const render = () => {
      const { x: mx, y: my, vx, vy } = mouse.current
      const speed = Math.sqrt(vx * vx + vy * vy)
      const inertiaActive = speed > speedTrigger

      ctx.clearRect(0, 0, canvas.width, canvas.height)

      dotsRef.current.forEach((dot) => {
        const dx = mx - (dot.ox + dot.x)
        const dy = my - (dot.oy + dot.y)
        const dist = Math.sqrt(dx * dx + dy * dy)
        const t = Math.max(0, 1 - dist / proximity)

        if (inertiaActive && dist < proximity) {
          const force = (speed / maxSpeed) * t
          dot.vx += (vx / speed) * force * (resistance / 100)
          dot.vy += (vy / speed) * force * (resistance / 100)
        }

        // Spring return
        dot.vx += (-dot.x) * 0.1
        dot.vy += (-dot.y) * 0.1
        dot.vx *= 0.75
        dot.vy *= 0.75
        dot.x += dot.vx
        dot.y += dot.vy

        const scale = 1 + t * 0.5
        const color = t > 0 ? lerpColor(baseColor, activeColor, t) : baseColor

        ctx.beginPath()
        ctx.arc(dot.ox + dot.x, dot.oy + dot.y, (dotSize / 2) * scale, 0, Math.PI * 2)
        ctx.fillStyle = color
        ctx.fill()
      })

      rafRef.current = requestAnimationFrame(render)
    }

    const onMouseMove = (e) => {
      const rect = canvas.getBoundingClientRect()
      const nx = e.clientX - rect.left
      const ny = e.clientY - rect.top
      mouse.current.vx = nx - mouse.current.px
      mouse.current.vy = ny - mouse.current.py
      mouse.current.px = mouse.current.x
      mouse.current.py = mouse.current.y
      mouse.current.x = nx
      mouse.current.y = ny
    }

    const onMouseLeave = () => {
      mouse.current = { x: -9999, y: -9999, vx: 0, vy: 0, px: -9999, py: -9999 }
    }

    const onClick = (e) => {
      const rect = canvas.getBoundingClientRect()
      const cx = e.clientX - rect.left
      const cy = e.clientY - rect.top

      dotsRef.current.forEach((dot) => {
        const dx = (dot.ox + dot.x) - cx
        const dy = (dot.oy + dot.y) - cy
        const dist = Math.sqrt(dx * dx + dy * dy)
        if (dist < shockRadius) {
          const force = ((shockRadius - dist) / shockRadius) * shockStrength
          const angle = Math.atan2(dy, dx)
          dot.vx += Math.cos(angle) * force * (resistance / 100)
          dot.vy += Math.sin(angle) * force * (resistance / 100)
        }
      })
    }

    buildGrid()
    render()

    // Attach to window so mouse works even when pointer-events:none on canvas
    window.addEventListener('mousemove', onMouseMove)
    canvas.addEventListener('mouseleave', onMouseLeave)
    canvas.parentElement?.addEventListener('click', onClick)

    const ro = new ResizeObserver(buildGrid)
    ro.observe(canvas)

    return () => {
      cancelAnimationFrame(rafRef.current)
      window.removeEventListener('mousemove', onMouseMove)
      canvas.removeEventListener('mouseleave', onMouseLeave)
      canvas.parentElement?.removeEventListener('click', onClick)
      ro.disconnect()
    }
  }, [dotSize, gap, baseColor, activeColor, proximity, speedTrigger, shockRadius, shockStrength, maxSpeed, resistance, returnDuration])

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{ width: '100%', height: '100%', display: 'block', pointerEvents: 'none', ...style }}
    />
  )
}
